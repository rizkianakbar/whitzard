// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IEscrow} from "./interfaces/IEscrow.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";

/// @title Escrow
/// @notice Holds health-aid contributions and releases them by fixed rules, with no admin.
///         A member opens a request; every member in the request's snapshot may contribute one
///         equal share; after the deadline anyone can `finalize` and the requester receives
///         everything collected (keep-it-all, even if partly funded). Before the deadline the
///         requester may cancel, and each contributor claims their share back.
/// @dev One singleton contract for all requests. The snapshot is the Registry's checkpointed
///      Ready (or registered, when `useReadyFilter` is false) count at `block.number - 1`, read in
///      O(log n): no loop over members. Membership in the snapshot is checked lazily on
///      `contribute`.
///
///      Funds leave only through `finalize` (to the requester) or `claimRefund` (to a contributor
///      of a cancelled request). State is always updated before tokens move, and both are
///      `nonReentrant`.
///
///      Right to request: a contribution counts as proof only while it is not refunded and its
///      request is not cancelled, so cancelling a request invalidates every contribution to it at
///      once, without a loop. The Registry checks the proof's round.
contract Escrow is IEscrow, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State {
        None,
        Active,
        Finalized,
        Expired,
        Cancelled
    }

    /// @dev Four storage slots.
    struct Request {
        address requester;
        uint64 deadline;
        uint32 snapshotSize;
        uint48 snapshotBlock;
        State state;
        uint32 contributors;
        uint32 refunds;
        uint128 share;
        uint128 amount;
        uint128 collected;
        bytes32 evidenceHash;
    }

    /// @dev `tag` is the Registry tag of the contribution (never 0), so `tag != 0` means "contributed".
    struct Contribution {
        uint64 tag;
        bool refunded;
    }

    /// @inheritdoc IEscrow
    uint64 public constant MIN_DURATION = 5 minutes;

    /// @inheritdoc IEscrow
    uint64 public constant MAX_DURATION = 30 days;

    /// @notice The contribution token (WhitzardToken).
    IERC20 public immutable token;

    /// @notice The membership Registry.
    IRegistry public immutable registry;

    /// @inheritdoc IEscrow
    bool public immutable useReadyFilter;

    /// @inheritdoc IEscrow
    uint256 public requestCount;

    /// @inheritdoc IEscrow
    mapping(address member => uint256) public latestRequestOf;

    mapping(uint256 id => Request) private _requests;
    mapping(uint256 id => mapping(address member => Contribution))
        private _contributions;

    /// @param token_ The contribution token; must support EIP-2612 for `contributeWithPermit`.
    /// @param registry_ The Registry; its `setEscrow` must be called with this contract.
    /// @param useReadyFilter_ Snapshot Ready members (true) or all registered members (false).
    constructor(IERC20 token_, IRegistry registry_, bool useReadyFilter_) {
        if (address(token_) == address(0) || address(registry_) == address(0))
            revert ZeroAddress();
        token = token_;
        registry = registry_;
        useReadyFilter = useReadyFilter_;
    }

    // ------------------------------------------------------------------ actions

    /// @inheritdoc IEscrow
    function openRequest(
        uint256 amount,
        uint64 duration,
        bytes32 evidenceHash,
        uint256 proofId
    ) external returns (uint256 id) {
        if (duration < MIN_DURATION || duration > MAX_DURATION) {
            revert DurationOutOfRange(duration, MIN_DURATION, MAX_DURATION);
        }
        if (amount == 0) revert ZeroAmount();
        if (amount > type(uint128).max) revert AmountTooLarge(amount);

        uint256 latest = latestRequestOf[msg.sender];
        if (latest != 0 && _isOpen(_requests[latest]))
            revert HasOpenRequest(latest);

        uint64 proofTag = _proofTag(msg.sender, proofId);
        if (proofTag == type(uint64).max) revert InvalidProof(proofId);

        uint256 snapshotBlock = block.number - 1;
        uint256 members = _snapshotCount(snapshotBlock);
        if (_inSnapshot(msg.sender, snapshotBlock)) members -= 1;
        if (members == 0) revert EmptySnapshot();
        uint256 share = amount / members;
        if (share == 0) revert ShareTooSmall(amount, members);

        registry.recordRequest(msg.sender, proofTag);

        id = ++requestCount;
        uint64 deadline = uint64(block.timestamp) + duration;
        _requests[id] = Request({
            requester: msg.sender,
            deadline: deadline,
            snapshotSize: SafeCast.toUint32(members),
            snapshotBlock: uint48(snapshotBlock),
            state: State.Active,
            contributors: 0,
            refunds: 0,
            share: uint128(share),
            amount: uint128(amount),
            collected: 0,
            evidenceHash: evidenceHash
        });
        latestRequestOf[msg.sender] = id;

        emit RequestOpened(
            id,
            msg.sender,
            amount,
            share,
            snapshotBlock,
            deadline,
            evidenceHash
        );
    }

    /// @inheritdoc IEscrow
    function contribute(uint256 id) external nonReentrant {
        _contribute(id, msg.sender);
    }

    /// @inheritdoc IEscrow
    function contributeWithPermit(
        uint256 id,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // Skip the permit if the allowance already covers the share: a permit would overwrite a
        // larger standing approval. A failed permit (e.g. already used by a front-runner) is
        // ignored; the transfer below still requires the allowance to be in place.
        uint256 share = _requests[id].share;
        if (token.allowance(msg.sender, address(this)) < share) {
            try
                IERC20Permit(address(token)).permit(
                    msg.sender,
                    address(this),
                    share,
                    permitDeadline,
                    v,
                    r,
                    s
                )
            {} catch {}
        }
        _contribute(id, msg.sender);
    }

    /// @inheritdoc IEscrow
    function cancelRequest(uint256 id) external {
        Request storage req = _get(id);
        if (msg.sender != req.requester) revert NotRequester(id, msg.sender);
        if (req.state != State.Active)
            revert RequestNotActive(id, _status(req));
        if (block.timestamp >= req.deadline)
            revert DeadlinePassed(id, req.deadline);

        req.state = State.Cancelled;
        registry.recordCancel(req.requester);

        emit RequestCancelled(id, req.requester, req.collected);
    }

    /// @inheritdoc IEscrow
    function claimRefund(uint256 id) external nonReentrant {
        Request storage req = _get(id);
        if (req.state != State.Cancelled)
            revert RequestNotActive(id, _status(req));
        Contribution storage c = _contributions[id][msg.sender];
        if (c.tag == 0 || c.refunded) revert NothingToRefund(id, msg.sender);

        uint256 share = req.share;
        c.refunded = true;
        req.refunds += 1;
        registry.revokeParticipation(msg.sender);

        token.safeTransfer(msg.sender, share);
        emit Refunded(id, msg.sender, share);
    }

    /// @inheritdoc IEscrow
    function finalize(uint256 id) external nonReentrant {
        Request storage req = _get(id);
        if (req.state != State.Active)
            revert RequestNotActive(id, _status(req));
        if (block.timestamp < req.deadline)
            revert DeadlineNotReached(id, req.deadline);

        uint256 total = req.collected;
        req.state = total > 0 ? State.Finalized : State.Expired;

        if (total > 0) token.safeTransfer(req.requester, total);
        emit RequestFinalized(id, req.requester, total);
    }

    // ------------------------------------------------------------------ views

    /// @inheritdoc IEscrow
    function getRequest(uint256 id) external view returns (RequestView memory) {
        Request storage req = _get(id);
        return
            RequestView({
                requester: req.requester,
                amount: req.amount,
                share: req.share,
                collected: req.collected,
                snapshotBlock: req.snapshotBlock,
                snapshotSize: req.snapshotSize,
                contributors: req.contributors,
                refunds: req.refunds,
                deadline: req.deadline,
                evidenceHash: req.evidenceHash,
                status: _status(req)
            });
    }

    /// @inheritdoc IEscrow
    function status(uint256 id) external view returns (Status) {
        return _status(_get(id));
    }

    /// @inheritdoc IEscrow
    function canFinalize(uint256 id) external view returns (bool) {
        Request storage req = _requests[id];
        return req.state == State.Active && block.timestamp >= req.deadline;
    }

    /// @inheritdoc IEscrow
    function canContribute(
        uint256 id,
        address member
    ) external view returns (bool) {
        Request storage req = _requests[id];
        return
            _isOpen(req) &&
            member != req.requester &&
            _contributions[id][member].tag == 0 &&
            _inSnapshot(member, req.snapshotBlock);
    }

    /// @inheritdoc IEscrow
    function isInSnapshot(
        uint256 id,
        address member
    ) external view returns (bool) {
        Request storage req = _get(id);
        return
            member != req.requester && _inSnapshot(member, req.snapshotBlock);
    }

    /// @inheritdoc IEscrow
    function contributionOf(
        uint256 id,
        address member
    ) external view returns (bool contributed, bool refunded) {
        Contribution storage c = _contributions[id][member];
        return (c.tag != 0, c.refunded);
    }

    /// @inheritdoc IEscrow
    /// @dev A best-effort preview: a view can only read Registry history up to the block before
    ///      the one it runs in, so a Ready change in the latest block is not reflected yet (the
    ///      transaction itself snapshots one block later). `openRequest` remains the authority.
    function canOpenRequest(
        address member,
        uint256 proofId
    ) external view returns (bool) {
        uint256 latest = latestRequestOf[member];
        if (latest != 0 && _isOpen(_requests[latest])) return false;

        uint64 proofTag = _proofTag(member, proofId);
        if (proofTag == type(uint64).max) return false;
        if (!registry.canRequestWith(member, proofTag)) return false;

        uint256 members = _snapshotCount(block.number - 1);
        if (_inSnapshot(member, block.number - 1)) members -= 1;
        return members > 0;
    }

    /// @inheritdoc IEscrow
    function pendingRefund(
        uint256 id,
        address member
    ) public view returns (uint256) {
        Request storage req = _requests[id];
        Contribution storage c = _contributions[id][member];
        if (req.state != State.Cancelled || c.tag == 0 || c.refunded) return 0;
        return req.share;
    }

    /// @inheritdoc IEscrow
    function pendingRefunds(
        address member,
        uint256[] calldata ids
    ) external view returns (uint256 total, uint256[] memory amounts) {
        amounts = new uint256[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            amounts[i] = pendingRefund(ids[i], member);
            total += amounts[i];
        }
    }

    // ------------------------------------------------------------------ internal

    function _contribute(uint256 id, address member) private {
        Request storage req = _get(id);
        if (req.state != State.Active)
            revert RequestNotActive(id, _status(req));
        if (block.timestamp >= req.deadline)
            revert DeadlinePassed(id, req.deadline);
        if (member == req.requester) revert RequesterCannotContribute(id);
        if (!_inSnapshot(member, req.snapshotBlock))
            revert NotInSnapshot(id, member);
        Contribution storage c = _contributions[id][member];
        if (c.tag != 0) revert AlreadyContributed(id, member);

        uint256 share = req.share;
        c.tag = registry.recordParticipation(member);
        req.collected += uint128(share);
        req.contributors += 1;

        token.safeTransferFrom(member, address(this), share);
        emit Contributed(id, member, share);
    }

    function _get(uint256 id) private view returns (Request storage req) {
        req = _requests[id];
        if (req.state == State.None) revert RequestNotFound(id);
    }

    function _isOpen(Request storage req) private view returns (bool) {
        return req.state == State.Active && block.timestamp < req.deadline;
    }

    function _status(Request storage req) private view returns (Status) {
        State state = req.state;
        if (state == State.Cancelled) return Status.Cancelled;
        if (state == State.Finalized) return Status.Finalized;
        if (state == State.Expired) return Status.Expired;
        if (block.timestamp < req.deadline) {
            return req.contributors == 0 ? Status.Open : Status.Funding;
        }
        return req.collected == 0 ? Status.Expired : Status.Funding;
    }

    /// @dev Returns the proof's Registry tag, 0 for no proof, or `type(uint64).max` if invalid.
    function _proofTag(
        address member,
        uint256 proofId
    ) private view returns (uint64) {
        if (proofId == 0) return 0;
        Contribution storage c = _contributions[proofId][member];
        if (
            c.tag == 0 ||
            c.refunded ||
            _requests[proofId].state == State.Cancelled
        ) {
            return type(uint64).max;
        }
        return c.tag;
    }

    function _snapshotCount(
        uint256 blockNumber
    ) private view returns (uint256) {
        return
            useReadyFilter
                ? registry.readyCountAt(blockNumber)
                : registry.registeredCountAt(blockNumber);
    }

    function _inSnapshot(
        address member,
        uint256 blockNumber
    ) private view returns (bool) {
        return
            useReadyFilter
                ? registry.wasReadyAt(member, blockNumber)
                : registry.wasRegisteredAt(member, blockNumber);
    }
}

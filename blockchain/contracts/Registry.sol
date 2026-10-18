// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    Checkpoints
} from "@openzeppelin/contracts/utils/structs/Checkpoints.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";

/// @title Registry
/// @notice Membership book for Whitzard. Stores who is registered, the history of every member's
///         Ready status, and whether a member may open a request.
/// @dev Ready history and the Ready / registered totals are OpenZeppelin `Checkpoints` keyed by
///      block number, so Escrow can read them at `block.number - 1` in O(log n) without looping
///      over members. Lookups for the current or a future block revert, so a member cannot change
///      the snapshot of a request opened in the same block.
///
///      Request rule: a member's first request is free. After that they must prove one
///      contribution to someone else's request made since their own last request. Every
///      contribution is tagged with the member's current `round` (incremented by each request);
///      Escrow checks that the proof contribution exists, was not refunded and belongs to a
///      request that was not cancelled, and passes its tag here. The Registry checks that the
///      tag's round still counts (`floor <= round`). A contribution already used to open a
///      request stays used. Cancelling one's own request restores the floor one had before
///      opening it, so the right to request comes back.
///
///      The escrow-only bookkeeping functions emit no events of their own: Escrow's
///      `RequestOpened`, `Contributed`, `RequestCancelled` and `Refunded` events record the
///      same facts.
contract Registry is IRegistry {
    using Checkpoints for Checkpoints.Trace208;

    /// @dev Packed into one storage slot to keep `contribute` cheap.
    struct Member {
        bool registered;
        uint48 registeredAtBlock;
        uint24 requestCount; // requests opened, not counting cancelled ones
        uint24 participations; // contributions not refunded
        uint32 round; // incremented by every request; tags contributions
        uint32 floor; // lowest round whose contributions count toward the next request
        uint32 savedFloor; // `floor` before the open request, restored on cancel
    }

    /// @notice The token whose balance is required to turn Ready on.
    IERC20 public immutable token;

    /// @notice The Escrow contract allowed to call the escrow-only functions (zero until wired).
    address public escrow;

    address private immutable _deployer;

    mapping(address member => Member) private _members;
    mapping(address member => Checkpoints.Trace208) private _readyHistory;
    Checkpoints.Trace208 private _readyCount;
    Checkpoints.Trace208 private _registeredCount;

    modifier onlyEscrow() {
        if (msg.sender != escrow) revert NotEscrow(msg.sender);
        _;
    }

    /// @param token_ The WhitzardToken contract.
    constructor(IERC20 token_) {
        if (address(token_) == address(0)) revert ZeroAddress();
        token = token_;
        _deployer = msg.sender;
    }

    // ------------------------------------------------------------------ members

    /// @inheritdoc IRegistry
    function register() external {
        Member storage m = _members[msg.sender];
        if (m.registered) revert AlreadyRegistered(msg.sender);

        m.registered = true;
        m.registeredAtBlock = _clock();
        _registeredCount.push(_clock(), _registeredCount.latest() + 1);

        emit Registered(msg.sender);
    }

    /// @inheritdoc IRegistry
    function setReady(bool ready) external {
        if (!_members[msg.sender].registered) revert NotRegistered(msg.sender);
        if (ready == isReady(msg.sender)) revert ReadyUnchanged(ready);
        if (ready && token.balanceOf(msg.sender) == 0)
            revert NoTokenBalance(msg.sender);

        uint48 now_ = _clock();
        _readyHistory[msg.sender].push(now_, ready ? 1 : 0);
        _readyCount.push(
            now_,
            ready ? _readyCount.latest() + 1 : _readyCount.latest() - 1
        );

        emit ReadyChanged(msg.sender, ready);
    }

    // ------------------------------------------------------------------ escrow-only

    /// @inheritdoc IRegistry
    function recordRequest(
        address member,
        uint64 proofTag
    ) external onlyEscrow {
        if (!canRequestWith(member, proofTag)) revert NotEligible(member);
        Member storage m = _members[member];

        m.savedFloor = m.floor;
        m.round += 1;
        m.floor = m.round;
        m.requestCount += 1;
    }

    /// @inheritdoc IRegistry
    function recordCancel(address member) external onlyEscrow {
        Member storage m = _members[member];
        if (m.requestCount == 0) revert NoRequestToCancel(member);

        m.requestCount -= 1;
        m.floor = m.savedFloor;
    }

    /// @inheritdoc IRegistry
    function recordParticipation(
        address member
    ) external onlyEscrow returns (uint64 tag) {
        Member storage m = _members[member];
        if (!m.registered) revert NotRegistered(member);

        m.participations += 1;
        return uint64(m.round) + 1;
    }

    /// @inheritdoc IRegistry
    function revokeParticipation(address member) external onlyEscrow {
        _members[member].participations -= 1;
    }

    // ------------------------------------------------------------------ wiring

    /// @inheritdoc IRegistry
    function setEscrow(address escrow_) external {
        if (msg.sender != _deployer) revert NotDeployer(msg.sender);
        if (escrow != address(0)) revert EscrowAlreadySet();
        if (escrow_ == address(0)) revert ZeroAddress();

        escrow = escrow_;
        emit EscrowSet(escrow_);
    }

    // ------------------------------------------------------------------ views

    /// @inheritdoc IRegistry
    function isRegistered(address member) external view returns (bool) {
        return _members[member].registered;
    }

    /// @inheritdoc IRegistry
    function wasRegisteredAt(
        address member,
        uint256 blockNumber
    ) external view returns (bool) {
        _checkPast(blockNumber);
        Member storage m = _members[member];
        return m.registered && m.registeredAtBlock <= blockNumber;
    }

    /// @inheritdoc IRegistry
    function isReady(address member) public view returns (bool) {
        return _readyHistory[member].latest() == 1;
    }

    /// @inheritdoc IRegistry
    function wasReadyAt(
        address member,
        uint256 blockNumber
    ) external view returns (bool) {
        return
            _readyHistory[member].upperLookupRecent(_checkPast(blockNumber)) ==
            1;
    }

    /// @inheritdoc IRegistry
    function readyCountAt(uint256 blockNumber) external view returns (uint256) {
        return _readyCount.upperLookupRecent(_checkPast(blockNumber));
    }

    /// @inheritdoc IRegistry
    function registeredCountAt(
        uint256 blockNumber
    ) external view returns (uint256) {
        return _registeredCount.upperLookupRecent(_checkPast(blockNumber));
    }

    /// @inheritdoc IRegistry
    function readyCount() external view returns (uint256) {
        return _readyCount.latest();
    }

    /// @inheritdoc IRegistry
    function registeredCount() external view returns (uint256) {
        return _registeredCount.latest();
    }

    /// @inheritdoc IRegistry
    function hasParticipated(address member) external view returns (bool) {
        return _members[member].participations > 0;
    }

    /// @inheritdoc IRegistry
    function canRequestWith(
        address member,
        uint64 proofTag
    ) public view returns (bool) {
        Member storage m = _members[member];
        if (!m.registered) return false;
        if (m.requestCount == 0) return true;
        if (proofTag == 0) return false;
        uint64 round = proofTag - 1;
        return round >= m.floor && round <= m.round;
    }

    /// @inheritdoc IRegistry
    function requestCount(address member) external view returns (uint256) {
        return _members[member].requestCount;
    }

    /// @inheritdoc IRegistry
    function currentTag(address member) external view returns (uint64) {
        return uint64(_members[member].round) + 1;
    }

    // ------------------------------------------------------------------ internal

    function _clock() private view returns (uint48) {
        return SafeCast.toUint48(block.number);
    }

    function _checkPast(uint256 blockNumber) private view returns (uint48) {
        if (blockNumber >= block.number)
            revert FutureLookup(blockNumber, block.number);
        return SafeCast.toUint48(blockNumber);
    }
}

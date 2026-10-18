// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @title IEscrow
/// @notice Health-aid requests: a requester asks for an amount, every member in the snapshot may
///         contribute one equal share, and the pool is released to the requester after the
///         deadline. The requester may cancel before the deadline; contributors then claim refunds.
///         Read by the backend indexer, the keeper and the frontend.
interface IEscrow {
    /// @notice Request status (thesis Tabel 3.4).
    /// @dev Open/Funding: before the deadline, without/with contributions. After the deadline a
    ///      request with funds stays Funding until `finalize` moves it to Finalized; one without
    ///      funds reads as Expired. Cancelled: the requester cancelled before the deadline.
    enum Status {
        Open,
        Funding,
        Finalized,
        Expired,
        Cancelled
    }

    /// @notice Everything stored about a request.
    struct RequestView {
        address requester;
        uint256 amount;
        uint256 share;
        uint256 collected;
        uint256 snapshotBlock;
        uint256 snapshotSize;
        uint256 contributors;
        uint256 refunds;
        uint64 deadline;
        bytes32 evidenceHash;
        Status status;
    }

    // ------------------------------------------------------------------ events

    /// @notice A request was opened. `share` is what each member in the snapshot contributes.
    event RequestOpened(
        uint256 indexed id,
        address indexed requester,
        uint256 amount,
        uint256 share,
        uint256 snapshotBlock,
        uint64 deadline,
        bytes32 evidenceHash
    );

    /// @notice `member` contributed `amount` (always the request's share) to request `id`.
    event Contributed(uint256 indexed id, address indexed member, uint256 amount);

    /// @notice Request `id` was finalized after its deadline; `total` went to the requester
    ///         (0 means the request expired with nothing collected).
    event RequestFinalized(uint256 indexed id, address indexed requester, uint256 total);

    /// @notice The requester cancelled request `id`; `total` is now claimable by its contributors.
    event RequestCancelled(uint256 indexed id, address indexed requester, uint256 total);

    /// @notice `member` claimed back their `amount` from cancelled request `id`.
    event Refunded(uint256 indexed id, address indexed member, uint256 amount);

    // ------------------------------------------------------------------ errors

    /// @notice `duration` is outside [`min`, `max`].
    error DurationOutOfRange(uint64 duration, uint64 min, uint64 max);

    /// @notice The requested amount is zero.
    error ZeroAmount();

    /// @notice The amount does not fit the contract's storage (more than 2^128 - 1).
    error AmountTooLarge(uint256 amount);

    /// @notice The requester already has request `id` open.
    error HasOpenRequest(uint256 id);

    /// @notice `proofId` is not a valid proof for the caller: no contribution, refunded, or the
    ///         request was cancelled.
    error InvalidProof(uint256 proofId);

    /// @notice No member other than the requester is in the snapshot.
    error EmptySnapshot();

    /// @notice `amount` split over `members` rounds down to a share of zero.
    error ShareTooSmall(uint256 amount, uint256 members);

    /// @notice Request `id` does not exist.
    error RequestNotFound(uint256 id);

    /// @notice Request `id` is not accepting this action in its current status.
    error RequestNotActive(uint256 id, Status status);

    /// @notice The deadline of request `id` has passed (late contribution or cancel).
    error DeadlinePassed(uint256 id, uint64 deadline);

    /// @notice The deadline of request `id` has not passed yet.
    error DeadlineNotReached(uint256 id, uint64 deadline);

    /// @notice The requester cannot contribute to their own request.
    error RequesterCannotContribute(uint256 id);

    /// @notice `member` was not in the snapshot of request `id`.
    error NotInSnapshot(uint256 id, address member);

    /// @notice `member` already contributed to request `id`.
    error AlreadyContributed(uint256 id, address member);

    /// @notice Only the requester may cancel request `id`.
    error NotRequester(uint256 id, address caller);

    /// @notice `member` has nothing to claim from request `id`.
    error NothingToRefund(uint256 id, address member);

    /// @notice The zero address is not allowed here.
    error ZeroAddress();

    // ------------------------------------------------------------------ actions

    /// @notice Opens a request for `amount` tokens, running for `duration` seconds.
    /// @param evidenceHash SHA-256 of the evidence document (stored off-chain by the backend).
    /// @param proofId A request the caller contributed to since their last request (0 = none,
    ///        only valid for the caller's first request). See {canOpenRequest}.
    /// @return id The new request's id (ids start at 1).
    function openRequest(
        uint256 amount,
        uint64 duration,
        bytes32 evidenceHash,
        uint256 proofId
    ) external returns (uint256 id);

    /// @notice Contributes exactly the request's share. Needs a prior `approve`.
    function contribute(uint256 id) external;

    /// @notice Approves by EIP-2612 signature and contributes in one transaction.
    /// @dev If the permit was already used (e.g. front-run), the contribution still goes ahead as
    ///      long as the allowance is in place.
    function contributeWithPermit(
        uint256 id,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /// @notice Cancels the caller's own request before its deadline. Moves no funds: each
    ///         contributor claims their share back with {claimRefund}.
    function cancelRequest(uint256 id) external;

    /// @notice Claims back the caller's contribution to cancelled request `id`.
    function claimRefund(uint256 id) external;

    /// @notice Sends everything collected to the requester. Anyone may call it after the deadline.
    function finalize(uint256 id) external;

    // ------------------------------------------------------------------ views

    /// @notice Minimum request duration.
    function MIN_DURATION() external view returns (uint64);

    /// @notice Maximum request duration.
    function MAX_DURATION() external view returns (uint64);

    /// @notice Whether snapshots use Ready members (true) or all registered members (false, RM5).
    function useReadyFilter() external view returns (bool);

    /// @notice Number of requests ever opened (the latest id).
    function requestCount() external view returns (uint256);

    /// @notice The latest request opened by `member` (0 if none). It may already be finished.
    function latestRequestOf(address member) external view returns (uint256);

    /// @notice Everything stored about request `id`.
    function getRequest(uint256 id) external view returns (RequestView memory);

    /// @notice Current status of request `id`.
    function status(uint256 id) external view returns (Status);

    /// @notice Whether `finalize(id)` would succeed now (for the keeper).
    function canFinalize(uint256 id) external view returns (bool);

    /// @notice Whether `member` may contribute to request `id` now.
    function canContribute(uint256 id, address member) external view returns (bool);

    /// @notice Whether `member` was in the snapshot of request `id`.
    function isInSnapshot(uint256 id, address member) external view returns (bool);

    /// @notice Whether `member` contributed to request `id`, and whether it was refunded.
    function contributionOf(
        uint256 id,
        address member
    ) external view returns (bool contributed, bool refunded);

    /// @notice Whether `member` could open a request now using `proofId` (0 = none).
    function canOpenRequest(address member, uint256 proofId) external view returns (bool);

    /// @notice Amount `member` can claim back from request `id` now (0 if nothing).
    function pendingRefund(uint256 id, address member) external view returns (uint256);

    /// @notice Pending refunds of `member` across `ids` (e.g. the ids from their `Contributed`
    ///         logs), so the UI can show "you have X to claim" in one call.
    /// @return total Sum of all pending refunds.
    /// @return amounts Pending refund per id, in the same order.
    function pendingRefunds(
        address member,
        uint256[] calldata ids
    ) external view returns (uint256 total, uint256[] memory amounts);
}

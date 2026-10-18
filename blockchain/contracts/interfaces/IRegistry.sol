// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @title IRegistry
/// @notice Membership book for Whitzard: registration, Ready status history and the right to
///         open a request. Read by Escrow, the backend indexer and the frontend.
interface IRegistry {
    /// @notice Emitted once when `member` registers.
    event Registered(address indexed member);

    /// @notice Emitted whenever `member` turns Ready on or off.
    event ReadyChanged(address indexed member, bool ready);

    /// @notice Emitted once when the Escrow address is wired in. It can never change afterwards.
    event EscrowSet(address indexed escrow);

    /// @notice The caller is already registered.
    error AlreadyRegistered(address member);

    /// @notice `member` is not registered.
    error NotRegistered(address member);

    /// @notice `setReady` was called with the status the caller already has.
    error ReadyUnchanged(bool ready);

    /// @notice Turning Ready on requires holding a token balance.
    error NoTokenBalance(address member);

    /// @notice `member` may not open a request right now.
    error NotEligible(address member);

    /// @notice `member` has no request to cancel.
    error NoRequestToCancel(address member);

    /// @notice History can only be read for past blocks (`blockNumber < currentBlock`).
    error FutureLookup(uint256 blockNumber, uint256 currentBlock);

    /// @notice Only the Escrow contract may call this function.
    error NotEscrow(address caller);

    /// @notice Only the deployer may wire the Escrow address.
    error NotDeployer(address caller);

    /// @notice The Escrow address has already been set.
    error EscrowAlreadySet();

    /// @notice The zero address is not allowed here.
    error ZeroAddress();

    // ------------------------------------------------------------------ members

    /// @notice Registers the caller as a member. Callable once per address.
    function register() external;

    /// @notice Turns the caller's Ready status on or off. Turning it on requires a token balance.
    /// @param ready The new status.
    function setReady(bool ready) external;

    // ------------------------------------------------------------------ escrow-only

    /// @notice Records that `member` opened a request. Reverts {NotEligible} if they may not.
    /// @param proofTag Tag of the contribution that proves the right to request (0 = none, only
    ///        valid for a member's first request). Escrow has already checked that the
    ///        contribution exists, was not refunded and belongs to a request that was not cancelled.
    function recordRequest(address member, uint64 proofTag) external;

    /// @notice Records that `member` cancelled their open request, restoring the right to request
    ///         they had before opening it.
    function recordCancel(address member) external;

    /// @notice Records a contribution by `member`.
    /// @return tag The member's current round + 1 (never 0). Escrow stores it with the
    ///         contribution; it is the `proofTag` when that contribution is used to open a request.
    function recordParticipation(address member) external returns (uint64 tag);

    /// @notice Takes back a refunded contribution by `member` from {hasParticipated}.
    function revokeParticipation(address member) external;

    // ------------------------------------------------------------------ wiring

    /// @notice One-time wiring of the Escrow address. Deployer only; locked forever afterwards.
    function setEscrow(address escrow_) external;

    // ------------------------------------------------------------------ views

    /// @notice The Escrow contract allowed to call the escrow-only functions (zero until wired).
    function escrow() external view returns (address);

    /// @notice Whether `member` is registered.
    function isRegistered(address member) external view returns (bool);

    /// @notice Whether `member` was registered at the end of past block `blockNumber`.
    function wasRegisteredAt(address member, uint256 blockNumber) external view returns (bool);

    /// @notice Whether `member` is Ready now.
    function isReady(address member) external view returns (bool);

    /// @notice Whether `member` was Ready at the end of past block `blockNumber`.
    function wasReadyAt(address member, uint256 blockNumber) external view returns (bool);

    /// @notice Number of Ready members at the end of past block `blockNumber`.
    function readyCountAt(uint256 blockNumber) external view returns (uint256);

    /// @notice Number of registered members at the end of past block `blockNumber`.
    function registeredCountAt(uint256 blockNumber) external view returns (uint256);

    /// @notice Number of Ready members now.
    function readyCount() external view returns (uint256);

    /// @notice Number of registered members now.
    function registeredCount() external view returns (uint256);

    /// @notice Whether `member` has at least one contribution that was not refunded.
    function hasParticipated(address member) external view returns (bool);

    /// @notice Whether `member` may open a request using the contribution tagged `proofTag`
    ///         (first request free; afterwards the tag must come from a contribution made since
    ///         their last request). Escrow's `canOpenRequest` adds the checks on the contribution.
    function canRequestWith(address member, uint64 proofTag) external view returns (bool);

    /// @notice Requests `member` has opened, not counting cancelled ones.
    function requestCount(address member) external view returns (uint256);

    /// @notice The tag a contribution by `member` made now would get.
    function currentTag(address member) external view returns (uint64);
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title VulnerableEscrow
/// @notice TEST ONLY, never deployed to Sepolia. A deliberately broken escrow for the reentrancy
///         experiment: `finalize` sends the funds **before** marking the request finalized
///         and has no reentrancy guard, so a requester who is called back during the transfer can
///         call `finalize` again and be paid again, out of other requests' pools.
contract VulnerableEscrow {
    struct Request {
        address requester;
        uint64 deadline;
        bool finalized;
        uint256 share;
        uint256 collected;
    }

    /// @notice The contribution token.
    IERC20 public immutable token;

    uint256 public requestCount;
    mapping(uint256 id => Request) public requests;

    /// @notice A request was opened.
    event RequestOpened(uint256 indexed id, address indexed requester, uint256 share, uint64 deadline);

    /// @notice `member` contributed `amount`.
    event Contributed(uint256 indexed id, address indexed member, uint256 amount);

    /// @notice `total` was sent to the requester.
    event RequestFinalized(uint256 indexed id, address indexed requester, uint256 total);

    /// @notice The request is already finalized.
    error AlreadyFinalized(uint256 id);

    /// @notice The deadline has not passed yet.
    error DeadlineNotReached(uint256 id);

    /// @param token_ The contribution token.
    constructor(IERC20 token_) {
        token = token_;
    }

    /// @notice Opens a request where each contribution is `share`.
    function openRequest(uint256 share, uint64 duration) external returns (uint256 id) {
        id = ++requestCount;
        uint64 deadline = uint64(block.timestamp) + duration;
        requests[id] = Request(msg.sender, deadline, false, share, 0);
        emit RequestOpened(id, msg.sender, share, deadline);
    }

    /// @notice Contributes one share.
    function contribute(uint256 id) external {
        Request storage req = requests[id];
        req.collected += req.share;
        token.transferFrom(msg.sender, address(this), req.share);
        emit Contributed(id, msg.sender, req.share);
    }

    /// @notice VULNERABLE: interaction before effects, no guard.
    function finalize(uint256 id) external {
        Request storage req = requests[id];
        if (req.finalized) revert AlreadyFinalized(id);
        if (block.timestamp < req.deadline) revert DeadlineNotReached(id);

        token.transfer(req.requester, req.collected); // (1) pay ...
        req.finalized = true; // (2) ... and only then record it
        emit RequestFinalized(id, req.requester, req.collected);
    }
}

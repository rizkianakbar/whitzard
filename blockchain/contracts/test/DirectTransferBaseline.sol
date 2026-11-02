// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title DirectTransferBaseline
/// @notice TEST ONLY, never deployed to Sepolia. Non-escrow baseline for the gas comparison
///         (K3): each member sends their contribution straight to the requester. No
///         snapshot, no pool, no deadline, no rules.
contract DirectTransferBaseline {
    using SafeERC20 for IERC20;

    /// @notice The token being sent.
    IERC20 public immutable token;

    /// @notice `from` sent `amount` directly to `to`.
    event DirectTransfer(address indexed from, address indexed to, uint256 amount);

    /// @param token_ The token being sent.
    constructor(IERC20 token_) {
        token = token_;
    }

    /// @notice Sends `amount` from the caller to `to`. Needs a prior `approve`.
    function send(address to, uint256 amount) external {
        token.safeTransferFrom(msg.sender, to, amount);
        emit DirectTransfer(msg.sender, to, amount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {HookToken, ITokenReceiver} from "./HookToken.sol";

/// @notice The escrow functions the attacker re-enters (implemented by `Escrow` and, for
///         `finalize`, by `VulnerableEscrow`).
interface IPayingEscrow {
    function finalize(uint256 id) external;
    function claimRefund(uint256 id) external;
}

/// @title ReentrancyAttacker
/// @notice TEST ONLY, never deployed to Sepolia. A malicious requester / contributor. When
///         the escrow pays it in {HookToken}, it is called back and calls the same paying function
///         again, as long as the escrow still holds enough to pay it once more.
/// @dev With `swallowFailures` set, a failed re-entry is caught and counted so the outer payout
///      can complete; otherwise the failure reverts the whole payout.
contract ReentrancyAttacker is ITokenReceiver {
    enum Mode {
        None,
        Finalize,
        ClaimRefund
    }

    HookToken public immutable token;
    IPayingEscrow public target;
    Mode public mode;
    uint256 public targetId;
    uint256 public expected; // amount paid per (re-)entry
    uint256 public maxReentries;
    bool public swallowFailures;

    uint256 public reentries;
    uint256 public failedReentries;

    /// @notice {reenter} may only be called by this contract itself.
    error OnlySelf();

    constructor(HookToken token_) {
        token = token_;
        token_.setHook(true);
    }

    /// @notice Calls `to` with `data` as this contract (setup: register, open, approve, ...).
    function exec(address to, bytes calldata data) external returns (bytes memory) {
        (bool ok, bytes memory ret) = to.call(data);
        if (!ok) {
            assembly {
                revert(add(ret, 32), mload(ret))
            }
        }
        return ret;
    }

    /// @notice Starts the attack: calls `mode`'s function on `target_` for request `id`.
    function attack(
        IPayingEscrow target_,
        Mode mode_,
        uint256 id,
        uint256 expected_,
        uint256 maxReentries_,
        bool swallowFailures_
    ) external {
        target = target_;
        mode = mode_;
        targetId = id;
        expected = expected_;
        maxReentries = maxReentries_;
        swallowFailures = swallowFailures_;
        _call();
        mode = Mode.None;
    }

    /// @inheritdoc ITokenReceiver
    function onTokenReceived(address, uint256) external {
        if (msg.sender != address(token) || mode == Mode.None) return;
        if (reentries >= maxReentries) return;
        if (IERC20(address(token)).balanceOf(address(target)) < expected) return;

        reentries++;
        if (swallowFailures) {
            try this.reenter() {} catch {
                failedReentries++;
            }
        } else {
            _call();
        }
    }

    /// @dev External so the call can be wrapped in try/catch.
    function reenter() external {
        if (msg.sender != address(this)) revert OnlySelf();
        _call();
    }

    function _call() private {
        if (mode == Mode.Finalize) target.finalize(targetId);
        else target.claimRefund(targetId);
    }
}

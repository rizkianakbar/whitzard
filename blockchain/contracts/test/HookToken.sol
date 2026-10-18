// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Receiver side of {HookToken}.
interface ITokenReceiver {
    /// @notice Called by {HookToken} after `amount` tokens from `from` arrive.
    function onTokenReceived(address from, uint256 amount) external;
}

/// @title HookToken
/// @notice TEST ONLY, never deployed to Sepolia. An ERC-20 that calls the recipient back after
///         every transfer (like ERC-777 / ERC-1363 hooks), giving a malicious recipient a chance to
///         re-enter the contract that is paying it (RM3). Recipients opt in with {setHook};
///         anyone can mint.
contract HookToken is ERC20 {
    /// @notice Whether `account` is called back on incoming transfers.
    mapping(address account => bool) public wantsHook;

    constructor() ERC20("Hook Token", "HOOK") {}

    /// @notice Mints `amount` to `to` (test helper).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Turns the callback on or off for the caller.
    function setHook(bool enabled) external {
        wantsHook[msg.sender] = enabled;
    }

    /// @dev Balances are updated first, then the recipient is called; its reverts propagate.
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (to != address(0) && wantsHook[to]) {
            ITokenReceiver(to).onTokenReceived(from, value);
        }
    }
}

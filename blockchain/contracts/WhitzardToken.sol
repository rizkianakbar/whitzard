// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title WhitzardToken (WHZD)
/// @notice Testnet ERC-20 used for community health-aid contributions. There is no owner,
///         no `mint()` and no initial supply: the public faucet is the only way tokens are created.
/// @dev EIP-2612 permit lets members approve and contribute in one transaction
///      (`Escrow.contributeWithPermit`). Transfer and permit logic is inherited from
///      OpenZeppelin Contracts v5; this contract only adds the faucet.
contract WhitzardToken is ERC20, ERC20Permit {
    /// @notice Tokens minted per faucet claim (18 decimals).
    uint256 public constant FAUCET_AMOUNT = 100 ether;

    /// @notice Minimum time between two claims by the same address.
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    /// @notice Maximum tokens a single address can ever claim from the faucet.
    uint256 public constant FAUCET_LIFETIME_CAP = 1_000 ether;

    /// @notice Total tokens `account` has claimed from the faucet.
    mapping(address account => uint256) public claimedTotal;

    /// @notice Earliest timestamp at which `account` can claim again (0 or a past timestamp = claimable now).
    mapping(address account => uint256) public nextClaimAt;

    /// @notice Emitted on every successful faucet claim.
    /// @param account Address that claimed and received the tokens.
    /// @param amount Tokens minted, at most `FAUCET_AMOUNT`.
    event FaucetClaimed(address indexed account, uint256 amount);

    /// @notice The caller claimed less than `FAUCET_COOLDOWN` ago.
    /// @param nextClaimAt Timestamp at which the caller can claim again.
    error FaucetCooldown(uint256 nextClaimAt);

    /// @notice The caller has already claimed `FAUCET_LIFETIME_CAP`.
    error FaucetCapReached();

    constructor() ERC20("Whitzard", "WHZD") ERC20Permit("Whitzard") {}

    /// @notice Mints `FAUCET_AMOUNT` to the caller, or only the remainder if less than that is left
    ///         under `FAUCET_LIFETIME_CAP`. Callable by anyone once per `FAUCET_COOLDOWN`.
    /// @dev Reverts {FaucetCooldown} before the cooldown has passed and {FaucetCapReached} once the
    ///      lifetime cap is claimed. The cooldown is checked first.
    function faucet() external {
        uint256 next = nextClaimAt[msg.sender];
        if (block.timestamp < next) revert FaucetCooldown(next);

        uint256 claimed = claimedTotal[msg.sender];
        if (claimed >= FAUCET_LIFETIME_CAP) revert FaucetCapReached();

        uint256 remaining = FAUCET_LIFETIME_CAP - claimed;
        uint256 amount = remaining < FAUCET_AMOUNT ? remaining : FAUCET_AMOUNT;

        claimedTotal[msg.sender] = claimed + amount;
        nextClaimAt[msg.sender] = block.timestamp + FAUCET_COOLDOWN;

        _mint(msg.sender, amount);
        emit FaucetClaimed(msg.sender, amount);
    }
}

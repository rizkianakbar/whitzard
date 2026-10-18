// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.37;

import {WhitzardToken} from "./WhitzardToken.sol";
import {Test} from "forge-std/Test.sol";
import {stdStorage, StdStorage} from "forge-std/StdStorage.sol";
import {
    ERC20Permit
} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @dev Shared EIP-2612 signing helper.
abstract contract PermitSigner is Test {
    bytes32 internal constant PERMIT_TYPEHASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

    function _permitDigest(
        WhitzardToken token,
        address owner,
        address spender,
        uint256 value,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonce, deadline)
        );
        return
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    token.DOMAIN_SEPARATOR(),
                    structHash
                )
            );
    }
}

contract WhitzardTokenTest is PermitSigner {
    using stdStorage for StdStorage;

    WhitzardToken token;

    uint256 constant AMOUNT = 100 ether;
    uint256 constant COOLDOWN = 1 days;
    uint256 constant CAP = 1_000 ether;
    uint256 constant START = 1_700_000_000;

    address alice;
    uint256 aliceKey;
    address mallory;
    uint256 malloryKey;
    address spender = makeAddr("spender");

    function setUp() public {
        vm.warp(START);
        token = new WhitzardToken();
        (alice, aliceKey) = makeAddrAndKey("alice");
        (mallory, malloryKey) = makeAddrAndKey("mallory");
    }

    // ---------------------------------------------------------------- metadata

    // K1
    function test_Metadata() public view {
        assertEq(token.name(), "Whitzard");
        assertEq(token.symbol(), "WHZD");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
        assertEq(token.FAUCET_AMOUNT(), AMOUNT);
        assertEq(token.FAUCET_COOLDOWN(), COOLDOWN);
        assertEq(token.FAUCET_LIFETIME_CAP(), CAP);
    }

    // K1
    function test_FreshAddressIsClaimableNow() public view {
        assertEq(token.claimedTotal(alice), 0);
        assertEq(token.nextClaimAt(alice), 0);
    }

    // ---------------------------------------------------------------- faucet

    // K1
    function test_FirstClaim() public {
        vm.expectEmit(true, false, false, true, address(token));
        emit WhitzardToken.FaucetClaimed(alice, AMOUNT);

        vm.prank(alice);
        token.faucet();

        assertEq(token.balanceOf(alice), AMOUNT);
        assertEq(token.totalSupply(), AMOUNT);
        assertEq(token.claimedTotal(alice), AMOUNT);
        assertEq(token.nextClaimAt(alice), START + COOLDOWN);
    }

    // K2
    function test_RevertWhen_ClaimWithinCooldown() public {
        vm.prank(alice);
        token.faucet();
        uint256 next = START + COOLDOWN;

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(WhitzardToken.FaucetCooldown.selector, next)
        );
        token.faucet();

        vm.warp(next - 1);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(WhitzardToken.FaucetCooldown.selector, next)
        );
        token.faucet();
    }

    // K1
    function test_ClaimAfterCooldown() public {
        vm.prank(alice);
        token.faucet();

        vm.warp(START + COOLDOWN);
        vm.prank(alice);
        token.faucet();

        assertEq(token.balanceOf(alice), 2 * AMOUNT);
        assertEq(token.claimedTotal(alice), 2 * AMOUNT);
        assertEq(token.nextClaimAt(alice), START + 2 * COOLDOWN);
    }

    // K2
    function test_CooldownIsPerAddress() public {
        vm.prank(alice);
        token.faucet();

        vm.prank(mallory);
        token.faucet();

        assertEq(token.balanceOf(mallory), AMOUNT);
        assertEq(token.totalSupply(), 2 * AMOUNT);
    }

    // K2
    function test_LifetimeCap() public {
        for (uint256 i = 0; i < CAP / AMOUNT; i++) {
            vm.warp(START + i * COOLDOWN);
            vm.prank(alice);
            token.faucet();
        }
        assertEq(token.claimedTotal(alice), CAP);
        assertEq(token.balanceOf(alice), CAP);

        vm.warp(token.nextClaimAt(alice));
        vm.prank(alice);
        vm.expectRevert(WhitzardToken.FaucetCapReached.selector);
        token.faucet();
    }

    // K2: the cooldown check runs before the cap check.
    function test_CappedAddressStillSeesCooldownFirst() public {
        stdstore
            .target(address(token))
            .sig("claimedTotal(address)")
            .with_key(alice)
            .checked_write(CAP - AMOUNT);
        vm.prank(alice);
        token.faucet();

        uint256 next = START + COOLDOWN;
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(WhitzardToken.FaucetCooldown.selector, next)
        );
        token.faucet();
    }

    // K2: FAUCET_LIFETIME_CAP is a multiple of FAUCET_AMOUNT, so seed storage to reach a partial claim.
    function test_PartialFinalClaim() public {
        stdstore
            .target(address(token))
            .sig("claimedTotal(address)")
            .with_key(alice)
            .checked_write(CAP - 50 ether);

        vm.expectEmit(true, false, false, true, address(token));
        emit WhitzardToken.FaucetClaimed(alice, 50 ether);

        vm.prank(alice);
        token.faucet();

        assertEq(token.balanceOf(alice), 50 ether);
        assertEq(token.claimedTotal(alice), CAP);

        vm.warp(token.nextClaimAt(alice));
        vm.prank(alice);
        vm.expectRevert(WhitzardToken.FaucetCapReached.selector);
        token.faucet();
    }

    // ---------------------------------------------------------------- permit

    // K1
    function test_Permit() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 digest = _permitDigest(
            token,
            alice,
            spender,
            AMOUNT,
            0,
            deadline
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceKey, digest);

        token.permit(alice, spender, AMOUNT, deadline, v, r, s);

        assertEq(token.allowance(alice, spender), AMOUNT);
        assertEq(token.nonces(alice), 1);
    }

    // K2
    function test_RevertWhen_PermitReplayed() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            aliceKey,
            _permitDigest(token, alice, spender, AMOUNT, 0, deadline)
        );
        token.permit(alice, spender, AMOUNT, deadline, v, r, s);

        // The nonce is now 1, so the same signature recovers to an unrelated address.
        address recovered = ecrecover(
            _permitDigest(token, alice, spender, AMOUNT, 1, deadline),
            v,
            r,
            s
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                ERC20Permit.ERC2612InvalidSigner.selector,
                recovered,
                alice
            )
        );
        token.permit(alice, spender, AMOUNT, deadline, v, r, s);
    }

    // K2
    function test_RevertWhen_PermitExpired() public {
        uint256 deadline = block.timestamp - 1;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            aliceKey,
            _permitDigest(token, alice, spender, AMOUNT, 0, deadline)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                ERC20Permit.ERC2612ExpiredSignature.selector,
                deadline
            )
        );
        token.permit(alice, spender, AMOUNT, deadline, v, r, s);
    }

    // K2
    function test_RevertWhen_PermitWrongSigner() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            malloryKey,
            _permitDigest(token, alice, spender, AMOUNT, 0, deadline)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                ERC20Permit.ERC2612InvalidSigner.selector,
                mallory,
                alice
            )
        );
        token.permit(alice, spender, AMOUNT, deadline, v, r, s);
    }

    // ---------------------------------------------------------------- fuzz

    // K2: random warp/claim sequences never push claimedTotal over the cap.
    function testFuzz_ClaimWarpSequence(uint32[24] calldata warps) public {
        for (uint256 i = 0; i < warps.length; i++) {
            vm.warp(block.timestamp + bound(warps[i], 0, 2 days));

            uint256 next = token.nextClaimAt(alice);
            uint256 claimed = token.claimedTotal(alice);

            vm.prank(alice);
            if (block.timestamp < next) {
                vm.expectRevert(
                    abi.encodeWithSelector(
                        WhitzardToken.FaucetCooldown.selector,
                        next
                    )
                );
            } else if (claimed >= CAP) {
                vm.expectRevert(WhitzardToken.FaucetCapReached.selector);
            }
            token.faucet();

            assertLe(token.claimedTotal(alice), CAP);
            assertEq(token.balanceOf(alice), token.claimedTotal(alice));
            assertEq(token.totalSupply(), token.claimedTotal(alice));
        }
    }

    // ---------------------------------------------------------------- gas

    // K3
    function test_Gas_Faucet() public {
        vm.prank(alice);
        vm.startSnapshotGas("faucet");
        token.faucet();
        vm.stopSnapshotGas();
    }

    // K3
    function test_Gas_Permit() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            aliceKey,
            _permitDigest(token, alice, spender, AMOUNT, 0, deadline)
        );

        vm.startSnapshotGas("permit");
        token.permit(alice, spender, AMOUNT, deadline, v, r, s);
        vm.stopSnapshotGas();
    }
}

/// @dev Test-only handler that drives the faucet for the invariant test. Never deployed.
contract FaucetHandler is Test {
    WhitzardToken public immutable token;
    address[] public actors;
    uint256 public ghostMinted;

    constructor(WhitzardToken token_) {
        token = token_;
        actors.push(makeAddr("actor0"));
        actors.push(makeAddr("actor1"));
        actors.push(makeAddr("actor2"));
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    function claim(uint256 actorSeed) external {
        address actor = actors[actorSeed % actors.length];
        if (block.timestamp < token.nextClaimAt(actor)) return;
        if (token.claimedTotal(actor) >= token.FAUCET_LIFETIME_CAP()) return;

        uint256 before = token.balanceOf(actor);
        vm.prank(actor);
        token.faucet();
        ghostMinted += token.balanceOf(actor) - before;
    }

    function warp(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 0, 3 days));
    }

    /// @dev Transfers move balances but must not affect supply or claimedTotal.
    function transfer(
        uint256 fromSeed,
        uint256 toSeed,
        uint256 amount
    ) external {
        address from = actors[fromSeed % actors.length];
        address to = actors[toSeed % actors.length];
        amount = bound(amount, 0, token.balanceOf(from));
        vm.prank(from);
        token.transfer(to, amount);
    }
}

contract WhitzardTokenInvariantTest is Test {
    WhitzardToken token;
    FaucetHandler handler;

    function setUp() public {
        vm.warp(1_700_000_000);
        token = new WhitzardToken();
        handler = new FaucetHandler(token);
        targetContract(address(handler));
    }

    // K2
    function invariant_TotalSupplyEqualsSumClaimed() public view {
        uint256 sum;
        for (uint256 i = 0; i < handler.actorCount(); i++) {
            sum += token.claimedTotal(handler.actors(i));
        }
        assertEq(token.totalSupply(), sum);
        assertEq(token.totalSupply(), handler.ghostMinted());
    }

    // K2
    function invariant_NoActorOverCap() public view {
        for (uint256 i = 0; i < handler.actorCount(); i++) {
            assertLe(
                token.claimedTotal(handler.actors(i)),
                token.FAUCET_LIFETIME_CAP()
            );
        }
    }
}

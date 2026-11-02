// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.37;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Escrow} from "./Escrow.sol";
import {IEscrow} from "./interfaces/IEscrow.sol";
import {Registry} from "./Registry.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {HookToken} from "./test/HookToken.sol";
import {VulnerableEscrow} from "./test/VulnerableEscrow.sol";
import {ReentrancyAttacker, IPayingEscrow} from "./test/ReentrancyAttacker.sol";

/// @dev A malicious requester / contributor re-enters the paying function from a token
///      callback. It drains `VulnerableEscrow`, and gets nothing extra from `Escrow`.
contract ReentrancyTest is Test {
    uint64 constant DURATION = 1 days;
    uint256 constant SHARE = 30 ether;

    HookToken hook;
    Registry registry;
    Escrow escrow;
    VulnerableEscrow vulnerable;
    ReentrancyAttacker attacker;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address dave = makeAddr("dave");

    function setUp() public {
        vm.roll(100);
        vm.warp(1_700_000_000);
        hook = new HookToken();
        registry = new Registry(IERC20(address(hook)));
        escrow = new Escrow(IERC20(address(hook)), IRegistry(address(registry)), true);
        registry.setEscrow(address(escrow));
        vulnerable = new VulnerableEscrow(IERC20(address(hook)));
        attacker = new ReentrancyAttacker(hook);

        address[4] memory members = [alice, bob, carol, dave];
        for (uint256 i = 0; i < members.length; i++) {
            hook.mint(members[i], 1_000 ether);
            vm.startPrank(members[i]);
            registry.register();
            registry.setReady(true);
            hook.approve(address(escrow), type(uint256).max);
            hook.approve(address(vulnerable), type(uint256).max);
            vm.stopPrank();
        }

        // The attacker is a registered, Ready member too.
        hook.mint(address(attacker), 1_000 ether);
        attacker.exec(address(registry), abi.encodeCall(Registry.register, ()));
        attacker.exec(address(registry), abi.encodeCall(Registry.setReady, (true)));
        attacker.exec(address(hook), abi.encodeCall(IERC20.approve, (address(escrow), type(uint256).max)));
        vm.roll(block.number + 1);
    }

    function _contributeAll(uint256 id, address[3] memory who) internal {
        for (uint256 i = 0; i < who.length; i++) {
            vm.prank(who[i]);
            escrow.contribute(id);
        }
    }

    /// @dev An honest request by alice, funded by bob, carol and dave: the money an attack would steal.
    function _honestEscrowPool() internal returns (uint256 id, uint256 pool) {
        vm.prank(alice);
        id = escrow.openRequest(4 * SHARE, DURATION, bytes32("honest"), 0); // 4 others in snapshot
        _contributeAll(id, [bob, carol, dave]);
        pool = 3 * SHARE;
    }

    // ---------------------------------------------------------------- the attack works on the vulnerable escrow

    // K2: re-entering finalize from the payout callback pays the attacker again and again, out of
    // other requests' pools.
    function test_AttackDrainsVulnerableEscrow() public {
        vm.prank(alice);
        uint256 honest = vulnerable.openRequest(SHARE, DURATION);
        for (uint256 i = 0; i < 3; i++) {
            vm.prank([bob, carol, dave][i]);
            vulnerable.contribute(honest);
        }

        bytes memory ret = attacker.exec(
            address(vulnerable),
            abi.encodeCall(VulnerableEscrow.openRequest, (SHARE, DURATION))
        );
        uint256 evil = abi.decode(ret, (uint256));
        vm.prank(bob);
        vulnerable.contribute(evil); // the attacker is owed exactly one share

        vm.warp(block.timestamp + DURATION);
        uint256 before = hook.balanceOf(address(attacker));
        attacker.attack(IPayingEscrow(address(vulnerable)), ReentrancyAttacker.Mode.Finalize, evil, SHARE, 10, false);

        uint256 stolen = hook.balanceOf(address(attacker)) - before;
        assertEq(stolen, 4 * SHARE); // owed 1 share, took all 4 in the contract
        assertEq(attacker.reentries(), 3);
        assertEq(hook.balanceOf(address(vulnerable)), 0);

        // The honest requester's pool is gone.
        vm.expectRevert();
        vulnerable.finalize(honest);
    }

    // ---------------------------------------------------------------- the same attack fails on Escrow

    // K2: re-entering Escrow.finalize reverts (nonReentrant), which reverts the whole payout.
    function test_FinalizeReentryRevertsOnEscrow() public {
        (, uint256 pool) = _honestEscrowPool();
        bytes memory ret = attacker.exec(
            address(escrow),
            abi.encodeCall(IEscrow.openRequest, (4 * SHARE, DURATION, bytes32("evil"), 0))
        );
        uint256 evil = abi.decode(ret, (uint256));
        _contributeAll(evil, [bob, carol, dave]);
        vm.warp(block.timestamp + DURATION);

        uint256 before = hook.balanceOf(address(attacker));
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        attacker.attack(IPayingEscrow(address(escrow)), ReentrancyAttacker.Mode.Finalize, evil, 3 * SHARE, 10, false);

        assertEq(hook.balanceOf(address(attacker)), before);
        assertEq(hook.balanceOf(address(escrow)), pool + 3 * SHARE);
        assertEq(uint8(escrow.status(evil)), uint8(IEscrow.Status.Funding)); // nothing changed
    }

    // K2: if the attacker swallows the failed re-entry, it receives exactly what it is owed, once.
    function test_FinalizeReentryGetsOnlyWhatIsOwed() public {
        (uint256 honest, uint256 pool) = _honestEscrowPool();
        bytes memory ret = attacker.exec(
            address(escrow),
            abi.encodeCall(IEscrow.openRequest, (4 * SHARE, DURATION, bytes32("evil"), 0))
        );
        uint256 evil = abi.decode(ret, (uint256));
        _contributeAll(evil, [bob, carol, dave]);
        vm.warp(block.timestamp + DURATION);

        uint256 before = hook.balanceOf(address(attacker));
        attacker.attack(IPayingEscrow(address(escrow)), ReentrancyAttacker.Mode.Finalize, evil, 3 * SHARE, 10, true);

        assertEq(hook.balanceOf(address(attacker)) - before, 3 * SHARE);
        assertEq(attacker.reentries(), 1);
        assertEq(attacker.failedReentries(), 1);
        assertEq(hook.balanceOf(address(escrow)), pool);

        // The honest request is untouched and still pays out in full.
        uint256 aliceBefore = hook.balanceOf(alice);
        escrow.finalize(honest);
        assertEq(hook.balanceOf(alice) - aliceBefore, pool);
    }

    // K2: the same holds for refunds: a contributor re-entering claimRefund gets its share once.
    function test_ClaimRefundReentryFailsOnEscrow() public {
        (, uint256 pool) = _honestEscrowPool();

        vm.prank(bob);
        uint256 id = escrow.openRequest(4 * SHARE, DURATION, bytes32("cancelled"), 0);
        attacker.exec(address(escrow), abi.encodeCall(IEscrow.contribute, (id)));
        vm.prank(carol);
        escrow.contribute(id);
        vm.prank(bob);
        escrow.cancelRequest(id);

        uint256 before = hook.balanceOf(address(attacker));
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        attacker.attack(IPayingEscrow(address(escrow)), ReentrancyAttacker.Mode.ClaimRefund, id, SHARE, 10, false);
        assertEq(hook.balanceOf(address(attacker)), before);

        attacker.attack(IPayingEscrow(address(escrow)), ReentrancyAttacker.Mode.ClaimRefund, id, SHARE, 10, true);
        assertEq(hook.balanceOf(address(attacker)) - before, SHARE);
        assertEq(attacker.failedReentries(), 1);
        assertEq(hook.balanceOf(address(escrow)), pool + SHARE); // carol's refund + honest pool remain
        assertEq(escrow.pendingRefund(id, carol), SHARE);
    }

    // ---------------------------------------------------------------- the attack tooling itself

    // K2
    function test_HookTokenCallsOptedInReceiversOnly() public {
        hook.mint(address(this), 10 ether);
        hook.transfer(address(attacker), 1 ether); // mode None: callback returns without acting
        hook.transfer(address(escrow), 1 ether); // not opted in: no callback, no revert
        assertTrue(hook.wantsHook(address(attacker)));
        assertFalse(hook.wantsHook(address(escrow)));
    }

    // K2
    function test_RevertWhen_ReenterCalledByOthers() public {
        vm.expectRevert(ReentrancyAttacker.OnlySelf.selector);
        attacker.reenter();
    }

    // K2: without an attacker, the vulnerable escrow behaves like a normal one.
    function test_VulnerableEscrowNormalFlow() public {
        vm.prank(alice);
        uint256 id = vulnerable.openRequest(SHARE, DURATION);
        vm.prank(bob);
        vulnerable.contribute(id);

        vm.expectRevert(abi.encodeWithSelector(VulnerableEscrow.DeadlineNotReached.selector, id));
        vulnerable.finalize(id);

        vm.warp(block.timestamp + DURATION);
        uint256 before = hook.balanceOf(alice);
        vulnerable.finalize(id);
        assertEq(hook.balanceOf(alice) - before, SHARE);

        vm.expectRevert(abi.encodeWithSelector(VulnerableEscrow.AlreadyFinalized.selector, id));
        vulnerable.finalize(id);
    }
}

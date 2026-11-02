// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.37;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Escrow} from "./Escrow.sol";
import {Registry} from "./Registry.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {WhitzardToken} from "./WhitzardToken.sol";
import {DirectTransferBaseline} from "./test/DirectTransferBaseline.sol";
import {NaiveSnapshotEscrow} from "./test/NaiveSnapshotEscrow.sol";

/// @dev The comparison contracts behave as described, and the snapshot cost of the naive design
///      grows with the member count while Escrow's checkpoint lookup stays flat.
///      Real transaction-gas numbers (real transaction gas) come from `scripts/gas-report.ts`.
contract BaselinesTest is Test {
    WhitzardToken token;
    Registry registry;
    Escrow escrow;
    NaiveSnapshotEscrow naive;
    DirectTransferBaseline direct;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        vm.roll(100);
        vm.warp(1_700_000_000);
        token = new WhitzardToken();
        registry = new Registry(IERC20(address(token)));
        escrow = new Escrow(IERC20(address(token)), IRegistry(address(registry)), true);
        registry.setEscrow(address(escrow));
        naive = new NaiveSnapshotEscrow();
        direct = new DirectTransferBaseline(IERC20(address(token)));
    }

    /// @dev Adds `count` Ready members to both the Registry and the naive escrow.
    function _addMembers(uint256 from, uint256 count) internal {
        for (uint256 i = from; i < from + count; i++) {
            address m = address(uint160(0x10000 + i));
            vm.startPrank(m);
            token.faucet();
            registry.register();
            registry.setReady(true);
            naive.register();
            naive.setReady(true);
            vm.stopPrank();
        }
        vm.roll(block.number + 1);
    }

    // ---------------------------------------------------------------- direct transfer baseline

    // K3
    function test_DirectTransferSendsToRecipient() public {
        vm.startPrank(alice);
        token.faucet();
        token.approve(address(direct), 30 ether);
        vm.expectEmit(true, true, false, true, address(direct));
        emit DirectTransferBaseline.DirectTransfer(alice, bob, 30 ether);
        direct.send(bob, 30 ether);
        vm.stopPrank();

        assertEq(token.balanceOf(bob), 30 ether);
        assertEq(token.balanceOf(address(direct)), 0);
    }

    // ---------------------------------------------------------------- naive snapshot escrow

    // K3
    function test_NaiveSnapshotCopiesReadyMembers() public {
        _addMembers(0, 5);
        address requester = address(uint160(0x10000));
        address notReady = address(uint160(0x10004));
        vm.prank(notReady);
        naive.setReady(false);

        vm.prank(requester);
        uint256 id = naive.openRequest(90 ether);

        (, , uint256 share, uint256 size) = naive.requests(id);
        assertEq(size, 3); // 5 members, minus the requester, minus one not Ready
        assertEq(share, 30 ether);
        assertFalse(naive.inSnapshot(id, requester));
        assertFalse(naive.inSnapshot(id, notReady));
        assertTrue(naive.inSnapshot(id, address(uint160(0x10001))));
        assertEq(naive.memberCount(), 5);
    }

    // K2
    function test_RevertWhen_NaiveRules() public {
        naive.register();
        vm.expectRevert(abi.encodeWithSelector(NaiveSnapshotEscrow.AlreadyRegistered.selector, address(this)));
        naive.register();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NaiveSnapshotEscrow.NotRegistered.selector, alice));
        naive.setReady(true);

        vm.expectRevert(NaiveSnapshotEscrow.EmptySnapshot.selector);
        naive.openRequest(1 ether);
    }

    // ---------------------------------------------------------------- scaling

    function _escrowOpenGas(address requester) internal returns (uint256 used) {
        vm.prank(requester);
        uint256 start = gasleft();
        escrow.openRequest(1_000 ether, 1 days, bytes32(0), 0);
        used = start - gasleft();
    }

    function _naiveOpenGas(address requester) internal returns (uint256 used) {
        vm.prank(requester);
        uint256 start = gasleft();
        naive.openRequest(1_000 ether);
        used = start - gasleft();
    }

    // K3: 10x the members costs the naive design ~10x the snapshot gas; Escrow stays flat.
    function test_SnapshotGasScaling() public {
        _addMembers(0, 10);
        uint256 escrow10 = _escrowOpenGas(address(uint160(0x10000)));
        uint256 naive10 = _naiveOpenGas(address(uint160(0x10000)));

        _addMembers(10, 90);
        uint256 escrow100 = _escrowOpenGas(address(uint160(0x10001)));
        uint256 naive100 = _naiveOpenGas(address(uint160(0x10001)));

        assertGt(naive100, naive10 * 7);
        assertLt(escrow100, escrow10 + 5_000);
        assertLt(escrow100, naive100);
    }
}

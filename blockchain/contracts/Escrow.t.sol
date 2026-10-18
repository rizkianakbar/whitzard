// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.37;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Escrow} from "./Escrow.sol";
import {IEscrow} from "./interfaces/IEscrow.sol";
import {Registry} from "./Registry.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {WhitzardToken} from "./WhitzardToken.sol";

/// @dev Shared setup: token, Registry and an Escrow (Ready filter on), plus helpers.
abstract contract EscrowFixture is Test {
    bytes32 internal constant PERMIT_TYPEHASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );
    bytes32 internal constant EVIDENCE = keccak256("hospital-bill.pdf");
    uint64 internal constant DURATION = 1 days;

    WhitzardToken token;
    Registry registry;
    Escrow escrow;

    address alice = makeAddr("alice"); // requester in most tests
    address bob;
    uint256 bobKey;
    address carol = makeAddr("carol");
    address dave = makeAddr("dave");
    address eve = makeAddr("eve"); // registered, never Ready unless a test says so

    function setUp() public virtual {
        vm.roll(100);
        vm.warp(1_700_000_000);
        (bob, bobKey) = makeAddrAndKey("bob");

        token = new WhitzardToken();
        registry = new Registry(IERC20(address(token)));
        escrow = new Escrow(
            IERC20(address(token)),
            IRegistry(address(registry)),
            true
        );
        registry.setEscrow(address(escrow));

        _join(alice);
        _join(bob);
        _join(carol);
        _join(dave);
        _fund(eve);
        vm.prank(eve);
        registry.register();
        _approve(eve);

        vm.roll(block.number + 1); // the joins are now in the past for snapshots
    }

    function _fund(address member) internal {
        vm.prank(member);
        token.faucet();
    }

    function _approve(address member) internal {
        vm.prank(member);
        token.approve(address(escrow), type(uint256).max);
    }

    function _join(address member) internal {
        _fund(member);
        vm.startPrank(member);
        registry.register();
        registry.setReady(true);
        token.approve(address(escrow), type(uint256).max);
        vm.stopPrank();
    }

    function _open(
        address requester,
        uint256 amount
    ) internal returns (uint256 id) {
        vm.prank(requester);
        id = escrow.openRequest(amount, DURATION, EVIDENCE, 0);
    }

    function _contribute(address member, uint256 id) internal {
        vm.prank(member);
        escrow.contribute(id);
    }

    function _signPermit(
        uint256 key,
        address owner,
        uint256 value,
        uint256 deadline
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                address(escrow),
                value,
                token.nonces(owner),
                deadline
            )
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );
        return vm.sign(key, digest);
    }

    function _deadlineOf(uint256 id) internal view returns (uint64) {
        return escrow.getRequest(id).deadline;
    }
}

contract EscrowTest is EscrowFixture {
    // ---------------------------------------------------------------- openRequest

    // K1
    function test_OpenRequest() public {
        uint256 expectedDeadline = block.timestamp + DURATION;
        vm.expectEmit(true, true, false, true, address(escrow));
        emit IEscrow.RequestOpened(
            1,
            alice,
            90 ether,
            30 ether,
            block.number - 1,
            uint64(expectedDeadline),
            EVIDENCE
        );
        uint256 id = _open(alice, 90 ether);

        assertEq(id, 1);
        assertEq(escrow.requestCount(), 1);
        assertEq(escrow.latestRequestOf(alice), 1);

        IEscrow.RequestView memory req = escrow.getRequest(id);
        assertEq(req.requester, alice);
        assertEq(req.amount, 90 ether);
        assertEq(req.share, 30 ether); // 4 Ready members, minus the requester
        assertEq(req.snapshotSize, 3);
        assertEq(req.snapshotBlock, block.number - 1);
        assertEq(req.deadline, expectedDeadline);
        assertEq(req.evidenceHash, EVIDENCE);
        assertEq(req.collected, 0);
        assertEq(uint8(req.status), uint8(IEscrow.Status.Open));
        assertEq(registry.requestCount(alice), 1);
    }

    // K1: share = amount / n rounded down; the dust is simply never requested.
    function test_ShareRoundsDown() public {
        uint256 id = _open(alice, 100 ether);
        assertEq(escrow.getRequest(id).share, uint256(100 ether) / 3);
    }

    // K4: a requester who is not Ready is not in the snapshot, so nobody is subtracted.
    function test_SnapshotWhenRequesterNotReady() public {
        vm.prank(alice);
        registry.setReady(false);
        vm.roll(block.number + 1);

        uint256 id = _open(alice, 90 ether);
        assertEq(escrow.getRequest(id).snapshotSize, 3);
        assertFalse(escrow.isInSnapshot(id, alice));
    }

    // K4: a member who turns Ready in the same block as openRequest is not in its snapshot.
    function test_SameBlockReadyIsNotInSnapshot() public {
        vm.prank(eve);
        registry.setReady(true);
        uint256 id = _open(alice, 90 ether);

        assertEq(escrow.getRequest(id).snapshotSize, 3);
        assertFalse(escrow.isInSnapshot(id, eve));
        vm.prank(eve);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.NotInSnapshot.selector, id, eve)
        );
        escrow.contribute(id);
    }

    // K2
    function test_RevertWhen_DurationOutOfRange() public {
        uint64 min = escrow.MIN_DURATION();
        uint64 max = escrow.MAX_DURATION();
        assertEq(min, 5 minutes);
        assertEq(max, 30 days);

        vm.startPrank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.DurationOutOfRange.selector,
                min - 1,
                min,
                max
            )
        );
        escrow.openRequest(90 ether, min - 1, EVIDENCE, 0);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.DurationOutOfRange.selector,
                max + 1,
                min,
                max
            )
        );
        escrow.openRequest(90 ether, max + 1, EVIDENCE, 0);

        escrow.openRequest(90 ether, min, EVIDENCE, 0); // bounds are inclusive
        vm.stopPrank();
    }

    // K2
    function test_RevertWhen_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(IEscrow.ZeroAmount.selector);
        escrow.openRequest(0, DURATION, EVIDENCE, 0);
    }

    // K2
    function test_RevertWhen_AmountTooLarge() public {
        uint256 amount = uint256(type(uint128).max) + 1;
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.AmountTooLarge.selector, amount)
        );
        escrow.openRequest(amount, DURATION, EVIDENCE, 0);
    }

    // K2
    function test_RevertWhen_HasOpenRequest() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(alice, _open(bob, 90 ether)); // alice now holds a valid proof

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.HasOpenRequest.selector, id)
        );
        escrow.openRequest(90 ether, DURATION, EVIDENCE, 2);
    }

    // K2
    function test_RevertWhen_EmptySnapshot() public {
        vm.prank(bob);
        registry.setReady(false);
        vm.prank(carol);
        registry.setReady(false);
        vm.prank(dave);
        registry.setReady(false);
        vm.roll(block.number + 1);

        vm.prank(alice);
        vm.expectRevert(IEscrow.EmptySnapshot.selector);
        escrow.openRequest(90 ether, DURATION, EVIDENCE, 0);
    }

    // K2
    function test_RevertWhen_ShareTooSmall() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.ShareTooSmall.selector, 2, 3)
        );
        escrow.openRequest(2, DURATION, EVIDENCE, 0);
    }

    // K2
    function test_RevertWhen_OpenerNotRegistered() public {
        address stranger = makeAddr("stranger");
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IRegistry.NotEligible.selector, stranger)
        );
        escrow.openRequest(90 ether, DURATION, EVIDENCE, 0);
    }

    // ---------------------------------------------------------------- right to request

    // K2
    function test_RevertWhen_SecondRequestWithoutProof() public {
        uint256 id = _open(alice, 90 ether);
        vm.warp(_deadlineOf(id));

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IRegistry.NotEligible.selector, alice)
        );
        escrow.openRequest(90 ether, DURATION, EVIDENCE, 0);
        assertFalse(escrow.canOpenRequest(alice, 0));
    }

    // K1: contributing to someone else's request gives the right to open the next one.
    function test_ProofAllowsNextRequest() public {
        uint256 first = _open(alice, 90 ether);
        uint256 bobs = _open(bob, 90 ether);
        _contribute(alice, bobs);
        vm.warp(_deadlineOf(first));

        assertTrue(escrow.canOpenRequest(alice, bobs));
        vm.prank(alice);
        uint256 second = escrow.openRequest(90 ether, DURATION, EVIDENCE, bobs);
        assertEq(registry.requestCount(alice), 2);

        // The proof is used now.
        vm.warp(_deadlineOf(second));
        assertFalse(escrow.canOpenRequest(alice, bobs));
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IRegistry.NotEligible.selector, alice)
        );
        escrow.openRequest(90 ether, DURATION, EVIDENCE, bobs);
    }

    // K2
    function test_RevertWhen_ProofWithoutContribution() public {
        uint256 first = _open(alice, 90 ether);
        uint256 bobs = _open(bob, 90 ether);
        vm.warp(_deadlineOf(first));

        assertFalse(escrow.canOpenRequest(alice, bobs));
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.InvalidProof.selector, bobs)
        );
        escrow.openRequest(90 ether, DURATION, EVIDENCE, bobs);
    }

    // K2: once a request is cancelled, contributions to it stop counting as proof immediately,
    // even before their refunds are claimed.
    function test_CancelledContributionIsNoLongerProof() public {
        uint256 first = _open(alice, 90 ether);
        uint256 bobs = _open(bob, 90 ether);
        _contribute(alice, bobs);
        vm.prank(bob);
        escrow.cancelRequest(bobs);
        vm.warp(_deadlineOf(first));

        assertFalse(escrow.canOpenRequest(alice, bobs));
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.InvalidProof.selector, bobs)
        );
        escrow.openRequest(90 ether, DURATION, EVIDENCE, bobs);
    }

    // K2: documented edge case: a proof already used stays used if its request is cancelled later.
    function test_UsedProofStaysUsedAfterLaterCancel() public {
        uint256 first = _open(alice, 90 ether);
        vm.prank(bob);
        uint256 bobs = escrow.openRequest(90 ether, 2 * DURATION, EVIDENCE, 0);
        _contribute(alice, bobs);
        vm.warp(_deadlineOf(first));

        vm.prank(alice);
        uint256 second = escrow.openRequest(90 ether, DURATION, EVIDENCE, bobs);
        vm.prank(bob);
        escrow.cancelRequest(bobs);

        assertEq(uint8(escrow.status(second)), uint8(IEscrow.Status.Open));
        assertEq(escrow.pendingRefund(bobs, alice), 30 ether);
    }

    // K1: cancelling one's own request gives back the right one had before opening it.
    function test_CancelRestoresRequestRight() public {
        uint256 id = _open(alice, 90 ether);
        assertFalse(escrow.canOpenRequest(alice, 0));
        vm.prank(alice);
        escrow.cancelRequest(id);

        assertEq(registry.requestCount(alice), 0);
        assertTrue(escrow.canOpenRequest(alice, 0));
        _open(alice, 90 ether);
    }

    // ---------------------------------------------------------------- contribute

    // K1
    function test_Contribute() public {
        uint256 id = _open(alice, 90 ether);
        uint256 before = token.balanceOf(bob);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit IEscrow.Contributed(id, bob, 30 ether);
        _contribute(bob, id);

        assertEq(token.balanceOf(bob), before - 30 ether);
        assertEq(token.balanceOf(address(escrow)), 30 ether);
        IEscrow.RequestView memory req = escrow.getRequest(id);
        assertEq(req.collected, 30 ether);
        assertEq(req.contributors, 1);
        assertEq(uint8(req.status), uint8(IEscrow.Status.Funding));
        (bool contributed, bool refunded) = escrow.contributionOf(id, bob);
        assertTrue(contributed);
        assertFalse(refunded);
        assertTrue(registry.hasParticipated(bob));
        assertFalse(escrow.canContribute(id, bob));
    }

    // K1: one transaction, no prior approve.
    function test_ContributeWithPermit() public {
        vm.prank(bob);
        token.approve(address(escrow), 0);
        uint256 id = _open(alice, 90 ether);

        uint256 permitDeadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(
            bobKey,
            bob,
            30 ether,
            permitDeadline
        );
        vm.prank(bob);
        escrow.contributeWithPermit(id, permitDeadline, v, r, s);

        assertEq(escrow.getRequest(id).collected, 30 ether);
        assertEq(token.nonces(bob), 1);
        assertEq(token.allowance(bob, address(escrow)), 0);
    }

    // K2: a front-runner who submits the permit first cannot block the contribution.
    function test_ContributeWithPermitFrontRun() public {
        vm.prank(bob);
        token.approve(address(escrow), 0);
        uint256 id = _open(alice, 90 ether);

        uint256 permitDeadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(
            bobKey,
            bob,
            30 ether,
            permitDeadline
        );
        vm.prank(carol);
        token.permit(bob, address(escrow), 30 ether, permitDeadline, v, r, s);

        vm.prank(bob);
        escrow.contributeWithPermit(id, permitDeadline, v, r, s);
        assertEq(escrow.getRequest(id).collected, 30 ether);
    }

    // K1: with a standing approval that covers the share, the permit is skipped and the approval
    // is left as it was (the signature's nonce is not used up).
    function test_ContributeWithPermitKeepsLargerApproval() public {
        uint256 id = _open(alice, 90 ether);
        uint256 permitDeadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(
            bobKey,
            bob,
            30 ether,
            permitDeadline
        );

        vm.prank(bob);
        escrow.contributeWithPermit(id, permitDeadline, v, r, s);

        assertEq(escrow.getRequest(id).collected, 30 ether);
        assertEq(token.allowance(bob, address(escrow)), type(uint256).max);
        assertEq(token.nonces(bob), 0);
    }

    // K2
    function test_RevertWhen_ContributeWithBadPermitAndNoAllowance() public {
        vm.prank(bob);
        token.approve(address(escrow), 0);
        uint256 id = _open(alice, 90 ether);

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector,
                address(escrow),
                0,
                30 ether
            )
        );
        escrow.contributeWithPermit(
            id,
            block.timestamp,
            27,
            bytes32(0),
            bytes32(0)
        );
    }

    // K2: late contributions are rejected, including exactly at the deadline.
    function test_RevertWhen_LateContribution() public {
        uint256 id = _open(alice, 90 ether);
        uint64 deadline = _deadlineOf(id);

        vm.warp(deadline - 1);
        _contribute(bob, id);

        vm.warp(deadline);
        assertFalse(escrow.canContribute(id, carol));
        vm.prank(carol);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.DeadlinePassed.selector,
                id,
                deadline
            )
        );
        escrow.contribute(id);
    }

    // K2
    function test_RevertWhen_RequesterContributes() public {
        uint256 id = _open(alice, 90 ether);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.RequesterCannotContribute.selector,
                id
            )
        );
        escrow.contribute(id);
    }

    // K2
    function test_RevertWhen_NotInSnapshot() public {
        uint256 id = _open(alice, 90 ether);
        assertFalse(escrow.canContribute(id, eve));
        vm.prank(eve);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.NotInSnapshot.selector, id, eve)
        );
        escrow.contribute(id);
    }

    // K2 / I4: no double contribution.
    function test_RevertWhen_AlreadyContributed() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.AlreadyContributed.selector, id, bob)
        );
        escrow.contribute(id);
    }

    // K2
    function test_RevertWhen_RequestNotFound() public {
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.RequestNotFound.selector, 7)
        );
        escrow.contribute(7);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.RequestNotFound.selector, 7)
        );
        escrow.finalize(7);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.RequestNotFound.selector, 7)
        );
        escrow.cancelRequest(7);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.RequestNotFound.selector, 7)
        );
        escrow.claimRefund(7);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.RequestNotFound.selector, 7)
        );
        escrow.getRequest(7);
    }

    // K2
    function test_RevertWhen_ContributeToCancelledOrFinalized() public {
        uint256 id = _open(alice, 90 ether);
        vm.prank(alice);
        escrow.cancelRequest(id);
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.RequestNotActive.selector,
                id,
                IEscrow.Status.Cancelled
            )
        );
        escrow.contribute(id);

        uint256 other = _open(bob, 90 ether);
        _contribute(carol, other);
        vm.warp(_deadlineOf(other));
        escrow.finalize(other);
        vm.prank(dave);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.RequestNotActive.selector,
                other,
                IEscrow.Status.Finalized
            )
        );
        escrow.contribute(other);
    }

    // K2
    function test_RevertWhen_ConstructedWithZeroAddress() public {
        vm.expectRevert(IEscrow.ZeroAddress.selector);
        new Escrow(IERC20(address(0)), IRegistry(address(registry)), true);
        vm.expectRevert(IEscrow.ZeroAddress.selector);
        new Escrow(IERC20(address(token)), IRegistry(address(0)), true);
    }

    // K2: nobody but Escrow moves pooled funds. Escrow never approves anyone, so the pool cannot
    // be pulled with transferFrom; only finalize (to the requester, after the deadline) and
    // claimRefund (to a contributor, after a cancel) send tokens out.
    function test_NobodyElseCanMovePooledFunds() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        _contribute(carol, id);
        address attacker = makeAddr("attacker");

        assertEq(token.allowance(address(escrow), attacker), 0);
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector,
                attacker,
                0,
                60 ether
            )
        );
        token.transferFrom(address(escrow), attacker, 60 ether);

        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.DeadlineNotReached.selector,
                id,
                _deadlineOf(id)
            )
        );
        escrow.finalize(id);

        // Even when the attacker triggers finalize, the funds go to the requester.
        vm.warp(_deadlineOf(id));
        uint256 aliceBefore = token.balanceOf(alice);
        vm.prank(attacker);
        escrow.finalize(id);
        assertEq(token.balanceOf(attacker), 0);
        assertEq(token.balanceOf(alice), aliceBefore + 60 ether);
    }

    // ---------------------------------------------------------------- finalize

    // K1: the requester receives exactly the recorded total; anyone can trigger it.
    function test_FinalizeFullyFunded() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        _contribute(carol, id);
        _contribute(dave, id);
        vm.warp(_deadlineOf(id));

        uint256 before = token.balanceOf(alice);
        assertTrue(escrow.canFinalize(id));
        vm.expectEmit(true, true, false, true, address(escrow));
        emit IEscrow.RequestFinalized(id, alice, 90 ether);
        vm.prank(makeAddr("keeper"));
        escrow.finalize(id);

        assertEq(token.balanceOf(alice), before + 90 ether);
        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(uint8(escrow.status(id)), uint8(IEscrow.Status.Finalized));
        assertFalse(escrow.canFinalize(id));
    }

    // K2: partial funding is still released.
    function test_FinalizePartiallyFunded() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        vm.warp(_deadlineOf(id));

        // After the deadline, before finalize: still Funding, ready to finalize.
        assertEq(uint8(escrow.status(id)), uint8(IEscrow.Status.Funding));

        uint256 before = token.balanceOf(alice);
        escrow.finalize(id);
        assertEq(token.balanceOf(alice), before + 30 ether);
        assertEq(uint8(escrow.status(id)), uint8(IEscrow.Status.Finalized));
    }

    // K2
    function test_FinalizeNothingCollectedExpires() public {
        uint256 id = _open(alice, 90 ether);
        vm.warp(_deadlineOf(id));
        assertEq(uint8(escrow.status(id)), uint8(IEscrow.Status.Expired));

        vm.expectEmit(true, true, false, true, address(escrow));
        emit IEscrow.RequestFinalized(id, alice, 0);
        escrow.finalize(id);
        assertEq(uint8(escrow.status(id)), uint8(IEscrow.Status.Expired));
    }

    // K2
    function test_RevertWhen_FinalizeBeforeDeadline() public {
        uint256 id = _open(alice, 90 ether);
        uint64 deadline = _deadlineOf(id);
        vm.warp(deadline - 1);
        assertFalse(escrow.canFinalize(id));
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.DeadlineNotReached.selector,
                id,
                deadline
            )
        );
        escrow.finalize(id);
    }

    // K2
    function test_RevertWhen_FinalizeTwice() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        vm.warp(_deadlineOf(id));
        escrow.finalize(id);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.RequestNotActive.selector,
                id,
                IEscrow.Status.Finalized
            )
        );
        escrow.finalize(id);
    }

    // K2
    function test_RevertWhen_FinalizeCancelled() public {
        uint256 id = _open(alice, 90 ether);
        vm.prank(alice);
        escrow.cancelRequest(id);
        vm.warp(_deadlineOf(id));
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.RequestNotActive.selector,
                id,
                IEscrow.Status.Cancelled
            )
        );
        escrow.finalize(id);
    }

    // K1: after the deadline the requester may open a new request (with a proof).
    function test_NewRequestAfterDeadlineBeforeFinalize() public {
        uint256 first = _open(alice, 90 ether);
        uint256 bobs = _open(bob, 90 ether);
        _contribute(alice, bobs);
        _contribute(carol, first);
        vm.warp(_deadlineOf(first));

        vm.prank(alice);
        escrow.openRequest(90 ether, DURATION, EVIDENCE, bobs);
        escrow.finalize(first); // the old one can still be finalized
        assertEq(uint8(escrow.status(first)), uint8(IEscrow.Status.Finalized));
    }

    // ---------------------------------------------------------------- cancel / refund

    // K1
    function test_CancelRequest() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        _contribute(carol, id);
        uint256 aliceBefore = token.balanceOf(alice);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit IEscrow.RequestCancelled(id, alice, 60 ether);
        vm.prank(alice);
        escrow.cancelRequest(id);

        assertEq(uint8(escrow.status(id)), uint8(IEscrow.Status.Cancelled));
        assertEq(token.balanceOf(alice), aliceBefore); // nothing to the requester
        assertEq(token.balanceOf(address(escrow)), 60 ether); // waiting to be claimed
        assertEq(escrow.pendingRefund(id, bob), 30 ether);
        assertEq(escrow.pendingRefund(id, dave), 0);
    }

    // K2
    function test_RevertWhen_CancelNotRequester() public {
        uint256 id = _open(alice, 90 ether);
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.NotRequester.selector, id, bob)
        );
        escrow.cancelRequest(id);
    }

    // K2
    function test_RevertWhen_CancelAfterDeadline() public {
        uint256 id = _open(alice, 90 ether);
        uint64 deadline = _deadlineOf(id);
        vm.warp(deadline);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.DeadlinePassed.selector,
                id,
                deadline
            )
        );
        escrow.cancelRequest(id);
    }

    // K2
    function test_RevertWhen_CancelTwice() public {
        uint256 id = _open(alice, 90 ether);
        vm.startPrank(alice);
        escrow.cancelRequest(id);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.RequestNotActive.selector,
                id,
                IEscrow.Status.Cancelled
            )
        );
        escrow.cancelRequest(id);
        vm.stopPrank();
    }

    // K1 / I5
    function test_ClaimRefund() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        vm.prank(alice);
        escrow.cancelRequest(id);
        uint256 before = token.balanceOf(bob);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit IEscrow.Refunded(id, bob, 30 ether);
        vm.prank(bob);
        escrow.claimRefund(id);

        assertEq(token.balanceOf(bob), before + 30 ether);
        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(escrow.pendingRefund(id, bob), 0);
        assertEq(escrow.getRequest(id).refunds, 1);
        (, bool refunded) = escrow.contributionOf(id, bob);
        assertTrue(refunded);
        assertFalse(registry.hasParticipated(bob));
    }

    // K2
    function test_RevertWhen_ClaimRefundTwice() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        vm.prank(alice);
        escrow.cancelRequest(id);

        vm.startPrank(bob);
        escrow.claimRefund(id);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.NothingToRefund.selector, id, bob)
        );
        escrow.claimRefund(id);
        vm.stopPrank();
    }

    // K2: nobody but a contributor can take money out of a cancelled request.
    function test_RevertWhen_ClaimRefundNotContributor() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        vm.startPrank(alice);
        escrow.cancelRequest(id);
        vm.expectRevert(
            abi.encodeWithSelector(IEscrow.NothingToRefund.selector, id, alice)
        );
        escrow.claimRefund(id);
        vm.stopPrank();
    }

    // K2
    function test_RevertWhen_ClaimRefundNotCancelled() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                IEscrow.RequestNotActive.selector,
                id,
                IEscrow.Status.Funding
            )
        );
        escrow.claimRefund(id);
    }

    // K1: the UI's "you have X to claim" across several requests.
    function test_PendingRefunds() public {
        uint256 a = _open(alice, 90 ether);
        uint256 c = _open(carol, 90 ether);
        uint256 d = _open(dave, 60 ether);
        _contribute(bob, a);
        _contribute(bob, c);
        _contribute(bob, d);
        vm.prank(alice);
        escrow.cancelRequest(a);
        vm.prank(dave);
        escrow.cancelRequest(d);

        uint256[] memory ids = new uint256[](4);
        ids[0] = a;
        ids[1] = c;
        ids[2] = d;
        ids[3] = 99; // unknown ids are just 0
        (uint256 total, uint256[] memory amounts) = escrow.pendingRefunds(
            bob,
            ids
        );
        assertEq(total, 50 ether);
        assertEq(amounts[0], 30 ether);
        assertEq(amounts[1], 0);
        assertEq(amounts[2], 20 ether);
        assertEq(amounts[3], 0);

        vm.prank(bob);
        escrow.claimRefund(a);
        (total, ) = escrow.pendingRefunds(bob, ids);
        assertEq(total, 20 ether);
    }

    // ---------------------------------------------------------------- RM5: no Ready filter

    // K4: without the filter the snapshot is every registered member, Ready or not.
    function test_NoReadyFilterUsesRegisteredMembers() public {
        Registry reg2 = new Registry(IERC20(address(token)));
        Escrow esc2 = new Escrow(
            IERC20(address(token)),
            IRegistry(address(reg2)),
            false
        );
        reg2.setEscrow(address(esc2));
        assertFalse(esc2.useReadyFilter());

        address[4] memory members = [alice, carol, dave, eve];
        for (uint256 i = 0; i < members.length; i++) {
            vm.prank(members[i]);
            reg2.register();
        }
        vm.prank(eve);
        token.approve(address(esc2), type(uint256).max);
        vm.roll(block.number + 1);

        vm.prank(alice);
        uint256 id = esc2.openRequest(90 ether, DURATION, EVIDENCE, 0);
        assertEq(esc2.getRequest(id).snapshotSize, 3);
        assertTrue(esc2.isInSnapshot(id, eve)); // not Ready anywhere, still counted

        vm.prank(eve);
        esc2.contribute(id);
        assertEq(esc2.getRequest(id).collected, 30 ether);
    }

    // ---------------------------------------------------------------- fuzz

    // K1 / K2: random amounts, contributors and timing; contributions after the deadline are
    // rejected and the requester receives exactly what was collected.
    function testFuzz_ContributionsAndTiming(
        uint96 amount,
        uint8 mask,
        uint32[3] calldata waits
    ) public {
        amount = uint96(bound(amount, 3, 300 ether));
        uint256 id = _open(alice, amount);
        IEscrow.RequestView memory req = escrow.getRequest(id);
        address[3] memory members = [bob, carol, dave];

        uint256 collected;
        for (uint256 i = 0; i < 3; i++) {
            vm.warp(block.timestamp + bound(waits[i], 0, DURATION / 2));
            if ((mask >> i) & 1 == 0) continue;
            vm.prank(members[i]);
            if (block.timestamp >= req.deadline) {
                vm.expectRevert(
                    abi.encodeWithSelector(
                        IEscrow.DeadlinePassed.selector,
                        id,
                        req.deadline
                    )
                );
                escrow.contribute(id);
            } else {
                escrow.contribute(id);
                collected += req.share;
            }
        }

        assertEq(escrow.getRequest(id).collected, collected);
        assertEq(token.balanceOf(address(escrow)), collected);
        assertLe(collected, amount);

        vm.warp(req.deadline);
        uint256 before = token.balanceOf(alice);
        escrow.finalize(id);
        assertEq(token.balanceOf(alice) - before, collected);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    // ---------------------------------------------------------------- gas

    // K3
    function test_Gas_OpenRequest() public {
        vm.prank(alice);
        vm.startSnapshotGas("openRequest");
        escrow.openRequest(90 ether, DURATION, EVIDENCE, 0);
        vm.stopSnapshotGas();
    }

    // K3
    function test_Gas_Contribute() public {
        uint256 id = _open(alice, 90 ether);
        vm.prank(bob);
        vm.startSnapshotGas("contribute");
        escrow.contribute(id);
        vm.stopSnapshotGas();
    }

    // K3
    function test_Gas_ContributeWithPermit() public {
        vm.prank(bob);
        token.approve(address(escrow), 0);
        uint256 id = _open(alice, 90 ether);
        uint256 permitDeadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(
            bobKey,
            bob,
            30 ether,
            permitDeadline
        );

        vm.prank(bob);
        vm.startSnapshotGas("contributeWithPermit");
        escrow.contributeWithPermit(id, permitDeadline, v, r, s);
        vm.stopSnapshotGas();
    }

    // K3
    function test_Gas_Finalize() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        vm.warp(_deadlineOf(id));
        vm.startSnapshotGas("finalize");
        escrow.finalize(id);
        vm.stopSnapshotGas();
    }

    // K3
    function test_Gas_CancelAndClaimRefund() public {
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);

        vm.prank(alice);
        vm.startSnapshotGas("cancelRequest");
        escrow.cancelRequest(id);
        vm.stopSnapshotGas();

        vm.prank(bob);
        vm.startSnapshotGas("claimRefund");
        escrow.claimRefund(id);
        vm.stopSnapshotGas();
    }

    // K3: one full cycle (open, 3 contributions, finalize).
    function test_Gas_FullCycle() public {
        vm.startSnapshotGas("fullCycle");
        uint256 id = _open(alice, 90 ether);
        _contribute(bob, id);
        _contribute(carol, id);
        _contribute(dave, id);
        vm.warp(_deadlineOf(id));
        escrow.finalize(id);
        vm.stopSnapshotGas();
    }
}

/// @dev Test-only handler for the Escrow invariant test. Never deployed.
contract EscrowHandler is Test {
    WhitzardToken public immutable token;
    Registry public immutable registry;
    Escrow public immutable escrow;
    address[] public actors;

    // Ghost accounting per request.
    mapping(uint256 id => uint256) public ghostContributed;
    mapping(uint256 id => uint256) public ghostRefunded;
    mapping(uint256 id => uint256) public ghostPaid;
    mapping(uint256 id => uint256) public ghostContributors;
    mapping(uint256 id => mapping(address member => uint256))
        public ghostContributionCount;

    // How often each action really did something (coverage check).
    uint256 public opens;
    uint256 public contributions;
    uint256 public cancels;
    uint256 public claims;
    uint256 public finalizes;

    constructor(WhitzardToken token_, Registry registry_, Escrow escrow_) {
        token = token_;
        registry = registry_;
        escrow = escrow_;
        for (uint256 i = 0; i < 5; i++) {
            address a = makeAddr(string(abi.encode("member", i)));
            actors.push(a);
            vm.prank(a);
            token.faucet();
            vm.startPrank(a);
            registry.register();
            registry.setReady(true);
            token.approve(address(escrow_), type(uint256).max);
            vm.stopPrank();
        }
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    /// @dev Opens a request for the first actor (from `seed`) who can, using any valid proof.
    function open(uint256 seed, uint256 amount, uint64 duration) external {
        amount = bound(amount, 10, 120 ether);
        duration = uint64(bound(duration, 5 minutes, 2 days));
        uint256 count = escrow.requestCount();
        for (uint256 i = 0; i < actors.length; i++) {
            address a = actors[(seed + i) % actors.length];
            for (uint256 proof = 0; proof <= count; proof++) {
                if (!escrow.canOpenRequest(a, proof)) continue;
                vm.prank(a);
                escrow.openRequest(amount, duration, bytes32(seed), proof);
                opens++;
                return;
            }
        }
    }

    /// @dev Makes the first possible (request, actor) contribution, starting from the seeds.
    function contribute(uint256 seed, uint256 idSeed) external {
        uint256 count = escrow.requestCount();
        for (uint256 j = 0; j < count; j++) {
            uint256 id = ((idSeed + j) % count) + 1;
            uint256 share = escrow.getRequest(id).share;
            for (uint256 i = 0; i < actors.length; i++) {
                address a = actors[(seed + i) % actors.length];
                if (!escrow.canContribute(id, a) || token.balanceOf(a) < share)
                    continue;
                vm.prank(a);
                escrow.contribute(id);
                ghostContributed[id] += share;
                ghostContributors[id] += 1;
                ghostContributionCount[id][a] += 1;
                contributions++;
                return;
            }
        }
    }

    function cancel(uint256 idSeed) external {
        uint256 count = escrow.requestCount();
        for (uint256 j = 0; j < count; j++) {
            uint256 id = ((idSeed + j) % count) + 1;
            IEscrow.RequestView memory req = escrow.getRequest(id);
            bool active = req.status == IEscrow.Status.Open ||
                req.status == IEscrow.Status.Funding;
            if (!active || block.timestamp >= req.deadline) continue;
            vm.prank(req.requester);
            escrow.cancelRequest(id);
            cancels++;
            return;
        }
    }

    function claim(uint256 seed, uint256 idSeed) external {
        uint256 count = escrow.requestCount();
        for (uint256 j = 0; j < count; j++) {
            uint256 id = ((idSeed + j) % count) + 1;
            for (uint256 i = 0; i < actors.length; i++) {
                address a = actors[(seed + i) % actors.length];
                uint256 amount = escrow.pendingRefund(id, a);
                if (amount == 0) continue;
                vm.prank(a);
                escrow.claimRefund(id);
                ghostRefunded[id] += amount;
                claims++;
                return;
            }
        }
    }

    function finalize(uint256 idSeed) external {
        uint256 count = escrow.requestCount();
        for (uint256 j = 0; j < count; j++) {
            uint256 id = ((idSeed + j) % count) + 1;
            if (!escrow.canFinalize(id)) continue;
            address requester = escrow.getRequest(id).requester;
            uint256 before = token.balanceOf(requester);
            escrow.finalize(id);
            ghostPaid[id] += token.balanceOf(requester) - before;
            finalizes++;
            return;
        }
    }

    function fund(uint256 seed) external {
        address a = actors[seed % actors.length];
        if (block.timestamp < token.nextClaimAt(a)) return;
        if (token.claimedTotal(a) >= token.FAUCET_LIFETIME_CAP()) return;
        vm.prank(a);
        token.faucet();
    }

    function toggleReady(uint256 seed) external {
        address a = actors[seed % actors.length];
        bool ready = !registry.isReady(a);
        if (ready && token.balanceOf(a) == 0) return;
        vm.prank(a);
        registry.setReady(ready);
    }

    function wait(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 1, 1 days));
        vm.roll(block.number + 1);
    }
}

contract EscrowInvariantTest is Test {
    WhitzardToken token;
    Registry registry;
    Escrow escrow;
    EscrowHandler handler;

    function setUp() public {
        vm.roll(100);
        vm.warp(1_700_000_000);
        token = new WhitzardToken();
        registry = new Registry(IERC20(address(token)));
        escrow = new Escrow(
            IERC20(address(token)),
            IRegistry(address(registry)),
            true
        );
        registry.setEscrow(address(escrow));
        handler = new EscrowHandler(token, registry, escrow);
        vm.roll(block.number + 1);
        targetContract(address(handler));
    }

    // K2 / I1, I2: the escrow's balance equals what is still owed: collected minus refunds for
    // open and cancelled requests, and nothing for finalized ones.
    function invariant_BalanceEqualsPools() public view {
        uint256 owed;
        for (uint256 id = 1; id <= escrow.requestCount(); id++) {
            IEscrow.RequestView memory req = escrow.getRequest(id);
            if (req.status == IEscrow.Status.Finalized) continue;
            if (req.status == IEscrow.Status.Expired) {
                assertEq(req.collected, 0);
                continue;
            }
            owed += req.collected - req.refunds * req.share;
        }
        assertEq(token.balanceOf(address(escrow)), owed);
    }

    // K1 / I3, I5: a finalized requester got exactly the collected total; a cancelled request paid
    // its requester nothing and refunds never exceed what was contributed.
    function invariant_PayoutsMatchContributions() public view {
        for (uint256 id = 1; id <= escrow.requestCount(); id++) {
            IEscrow.RequestView memory req = escrow.getRequest(id);
            assertEq(req.collected, handler.ghostContributed(id));
            assertEq(req.collected, req.contributors * req.share);
            assertEq(req.refunds * req.share, handler.ghostRefunded(id));
            if (req.status == IEscrow.Status.Finalized) {
                assertEq(handler.ghostPaid(id), req.collected);
            } else {
                assertEq(handler.ghostPaid(id), 0);
            }
            if (req.status == IEscrow.Status.Cancelled) {
                assertLe(handler.ghostRefunded(id), req.collected);
            } else {
                assertEq(handler.ghostRefunded(id), 0);
            }
        }
    }

    // K2 / I4: at most one contribution per member per request, never more than the snapshot.
    function invariant_NoDoubleContribution() public view {
        for (uint256 id = 1; id <= escrow.requestCount(); id++) {
            IEscrow.RequestView memory req = escrow.getRequest(id);
            assertLe(req.contributors, req.snapshotSize);
            assertLe(req.refunds, req.contributors);
            assertEq(req.contributors, handler.ghostContributors(id));
            for (uint256 i = 0; i < handler.actorCount(); i++) {
                assertLe(
                    handler.ghostContributionCount(id, handler.actors(i)),
                    1
                );
            }
        }
    }
}

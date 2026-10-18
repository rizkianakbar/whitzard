// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.37;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Registry} from "./Registry.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {WhitzardToken} from "./WhitzardToken.sol";

/// @dev Shared setup: a token, a Registry wired to this test contract as its Escrow.
abstract contract RegistryFixture is Test {
    WhitzardToken token;
    Registry registry;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    function setUp() public virtual {
        vm.roll(100);
        vm.warp(1_700_000_000);
        token = new WhitzardToken();
        registry = new Registry(IERC20(address(token)));
        registry.setEscrow(address(this));
    }

    function _fund(address member) internal {
        vm.prank(member);
        token.faucet();
    }

    function _register(address member) internal {
        vm.prank(member);
        registry.register();
    }

    function _setReady(address member, bool ready) internal {
        vm.prank(member);
        registry.setReady(ready);
    }

    /// @dev Funded, registered and Ready.
    function _join(address member) internal {
        _fund(member);
        _register(member);
        _setReady(member, true);
    }
}

contract RegistryTest is RegistryFixture {
    // ---------------------------------------------------------------- registration

    // K1
    function test_Register() public {
        vm.expectEmit(true, false, false, false, address(registry));
        emit IRegistry.Registered(alice);
        _register(alice);

        assertTrue(registry.isRegistered(alice));
        assertFalse(registry.isReady(alice));
        assertEq(registry.registeredCount(), 1);
        assertTrue(registry.canRequestWith(alice, 0));

        vm.roll(block.number + 1);
        assertEq(registry.registeredCountAt(block.number - 1), 1);
        assertEq(registry.registeredCountAt(block.number - 2), 0);
        assertTrue(registry.wasRegisteredAt(alice, block.number - 1));
        assertFalse(registry.wasRegisteredAt(alice, block.number - 2));
        assertFalse(registry.wasRegisteredAt(bob, block.number - 1));
    }

    // K2
    function test_RevertWhen_RegisterTwice() public {
        _register(alice);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IRegistry.AlreadyRegistered.selector, alice));
        registry.register();
    }

    // ---------------------------------------------------------------- ready

    // K4
    function test_SetReady() public {
        _fund(alice);
        _register(alice);

        vm.expectEmit(true, false, false, true, address(registry));
        emit IRegistry.ReadyChanged(alice, true);
        _setReady(alice, true);

        assertTrue(registry.isReady(alice));
        assertEq(registry.readyCount(), 1);

        vm.expectEmit(true, false, false, true, address(registry));
        emit IRegistry.ReadyChanged(alice, false);
        _setReady(alice, false);

        assertFalse(registry.isReady(alice));
        assertEq(registry.readyCount(), 0);
    }

    // K2
    function test_RevertWhen_SetReadyNotRegistered() public {
        _fund(alice);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IRegistry.NotRegistered.selector, alice));
        registry.setReady(true);
    }

    // K2
    function test_RevertWhen_SetReadyUnchanged() public {
        _fund(alice);
        _register(alice);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IRegistry.ReadyUnchanged.selector, false));
        registry.setReady(false);

        _setReady(alice, true);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IRegistry.ReadyUnchanged.selector, true));
        registry.setReady(true);
    }

    // K2
    function test_RevertWhen_SetReadyWithoutBalance() public {
        _register(alice);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IRegistry.NoTokenBalance.selector, alice));
        registry.setReady(true);
    }

    // K4: turning Ready off is always allowed, even after spending every token.
    function test_SetReadyFalseWithoutBalance() public {
        _join(alice);
        vm.startPrank(alice);
        token.transfer(bob, token.balanceOf(alice));
        registry.setReady(false);
        vm.stopPrank();
        assertFalse(registry.isReady(alice));
    }

    // K4
    function test_ReadyHistoryAcrossBlocks() public {
        _fund(alice);
        _fund(bob);
        _register(alice);
        _register(bob);

        uint256 b0 = block.number;
        _setReady(alice, true);
        vm.roll(b0 + 2);
        _setReady(bob, true);
        vm.roll(b0 + 5);
        _setReady(alice, false);
        vm.roll(b0 + 6);

        assertEq(registry.readyCountAt(b0 - 1), 0);
        assertEq(registry.readyCountAt(b0), 1);
        assertEq(registry.readyCountAt(b0 + 1), 1);
        assertEq(registry.readyCountAt(b0 + 2), 2);
        assertEq(registry.readyCountAt(b0 + 4), 2);
        assertEq(registry.readyCountAt(b0 + 5), 1);

        assertFalse(registry.wasReadyAt(alice, b0 - 1));
        assertTrue(registry.wasReadyAt(alice, b0));
        assertTrue(registry.wasReadyAt(alice, b0 + 4));
        assertFalse(registry.wasReadyAt(alice, b0 + 5));
        assertFalse(registry.wasReadyAt(bob, b0 + 1));
        assertTrue(registry.wasReadyAt(bob, b0 + 5));
    }

    // K4: toggling twice in one block leaves one checkpoint holding the final value.
    function test_ToggleTwiceInSameBlock() public {
        _join(alice);
        _setReady(alice, false);
        assertEq(registry.readyCount(), 0);

        vm.roll(block.number + 1);
        assertEq(registry.readyCountAt(block.number - 1), 0);
        assertFalse(registry.wasReadyAt(alice, block.number - 1));
    }

    // K2: a toggle in the current block is not visible to snapshot lookups until the block is past.
    function test_RevertWhen_LookupCurrentOrFutureBlock() public {
        _join(alice);
        uint256 current = block.number;

        bytes memory err = abi.encodeWithSelector(IRegistry.FutureLookup.selector, current, current);
        vm.expectRevert(err);
        registry.readyCountAt(current);
        vm.expectRevert(err);
        registry.registeredCountAt(current);
        vm.expectRevert(err);
        registry.wasReadyAt(alice, current);
        vm.expectRevert(err);
        registry.wasRegisteredAt(alice, current);

        vm.expectRevert(abi.encodeWithSelector(IRegistry.FutureLookup.selector, current + 1, current));
        registry.readyCountAt(current + 1);

        assertEq(registry.readyCountAt(current - 1), 0);
    }

    // ---------------------------------------------------------------- wiring

    // K2
    function test_SetEscrow() public {
        Registry fresh = new Registry(IERC20(address(token)));
        assertEq(fresh.escrow(), address(0));

        vm.expectEmit(true, false, false, false, address(fresh));
        emit IRegistry.EscrowSet(carol);
        fresh.setEscrow(carol);
        assertEq(fresh.escrow(), carol);
    }

    // K2
    function test_RevertWhen_SetEscrowTwice() public {
        vm.expectRevert(IRegistry.EscrowAlreadySet.selector);
        registry.setEscrow(carol);
    }

    // K2
    function test_RevertWhen_SetEscrowNotDeployer() public {
        Registry fresh = new Registry(IERC20(address(token)));
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IRegistry.NotDeployer.selector, alice));
        fresh.setEscrow(alice);
    }

    // K2
    function test_RevertWhen_SetEscrowZero() public {
        Registry fresh = new Registry(IERC20(address(token)));
        vm.expectRevert(IRegistry.ZeroAddress.selector);
        fresh.setEscrow(address(0));
    }

    // K2
    function test_RevertWhen_ConstructedWithZeroToken() public {
        vm.expectRevert(IRegistry.ZeroAddress.selector);
        new Registry(IERC20(address(0)));
    }

    // K2: nobody but Escrow can touch request/participation bookkeeping, including before wiring.
    function test_RevertWhen_EscrowOnlyCalledByOthers() public {
        _register(alice);
        bytes memory err = abi.encodeWithSelector(IRegistry.NotEscrow.selector, alice);

        vm.startPrank(alice);
        vm.expectRevert(err);
        registry.recordRequest(alice, 0);
        vm.expectRevert(err);
        registry.recordCancel(alice);
        vm.expectRevert(err);
        registry.recordParticipation(alice);
        vm.expectRevert(err);
        registry.revokeParticipation(alice);
        vm.stopPrank();

        Registry unwired = new Registry(IERC20(address(token)));
        vm.prank(alice);
        vm.expectRevert(err);
        unwired.recordParticipation(alice);
    }

    // ---------------------------------------------------------------- request rule

    // K1
    function test_FirstRequestIsFree() public {
        _register(alice);
        assertTrue(registry.canRequestWith(alice, 0));
        registry.recordRequest(alice, 0);

        assertEq(registry.requestCount(alice), 1);
        assertFalse(registry.canRequestWith(alice, 0));
    }

    // K2
    function test_RevertWhen_RecordRequestNotRegistered() public {
        assertFalse(registry.canRequestWith(alice, 0));
        vm.expectRevert(
            abi.encodeWithSelector(IRegistry.NotEligible.selector, alice)
        );
        registry.recordRequest(alice, 0);
    }

    // K2
    function test_RevertWhen_SecondRequestWithoutProof() public {
        _register(alice);
        registry.recordRequest(alice, 0);
        vm.expectRevert(
            abi.encodeWithSelector(IRegistry.NotEligible.selector, alice)
        );
        registry.recordRequest(alice, 0);
    }

    // K1
    function test_TagsAreNeverZero() public {
        _register(alice);
        assertEq(registry.currentTag(alice), 1);
        assertEq(registry.recordParticipation(alice), 1);
        registry.recordRequest(alice, 0);
        assertEq(registry.currentTag(alice), 2);
        assertEq(registry.recordParticipation(alice), 2);
    }

    // K1
    function test_ProofSinceLastRequestGivesRight() public {
        _register(alice);
        registry.recordRequest(alice, 0);
        uint64 tag = registry.recordParticipation(alice);

        assertTrue(registry.canRequestWith(alice, tag));
        registry.recordRequest(alice, tag);
        assertEq(registry.requestCount(alice), 2);

        // The proof is used: it does not open a third request.
        assertFalse(registry.canRequestWith(alice, tag));
        vm.expectRevert(
            abi.encodeWithSelector(IRegistry.NotEligible.selector, alice)
        );
        registry.recordRequest(alice, tag);
    }

    // K1: contributions made before the first (free) request are used by it.
    function test_ProofBeforeFirstRequestIsUsedByIt() public {
        _register(alice);
        uint64 tag = registry.recordParticipation(alice);
        registry.recordRequest(alice, 0);
        assertFalse(registry.canRequestWith(alice, tag));
    }

    // K2
    function test_RevertWhen_ProofFromFutureRound() public {
        _register(alice);
        registry.recordRequest(alice, 0);
        uint64 future = registry.currentTag(alice) + 1;
        assertFalse(registry.canRequestWith(alice, future));
        vm.expectRevert(
            abi.encodeWithSelector(IRegistry.NotEligible.selector, alice)
        );
        registry.recordRequest(alice, future);
    }

    // K1
    function test_HasParticipated() public {
        _register(alice);
        assertFalse(registry.hasParticipated(alice));
        registry.recordParticipation(alice);
        assertTrue(registry.hasParticipated(alice));
        registry.revokeParticipation(alice);
        assertFalse(registry.hasParticipated(alice));
    }

    // K2
    function test_RevertWhen_RecordParticipationNotRegistered() public {
        vm.expectRevert(
            abi.encodeWithSelector(IRegistry.NotRegistered.selector, alice)
        );
        registry.recordParticipation(alice);
    }

    // ---------------------------------------------------------------- cancel

    // K1
    function test_CancelRestoresFreeFirstRequest() public {
        _register(alice);
        registry.recordRequest(alice, 0);
        registry.recordCancel(alice);

        assertEq(registry.requestCount(alice), 0);
        assertTrue(registry.canRequestWith(alice, 0));
    }

    // K1
    function test_CancelRestoresUsedProof() public {
        _register(alice);
        registry.recordRequest(alice, 0);
        uint64 tag = registry.recordParticipation(alice);
        registry.recordRequest(alice, tag);
        registry.recordCancel(alice);

        assertEq(registry.requestCount(alice), 1);
        assertTrue(registry.canRequestWith(alice, tag));
    }

    // K1: a contribution made while one's own request is open counts toward the next request,
    // whether that request finishes or is cancelled.
    function test_ContributionDuringOpenRequest() public {
        _register(alice);
        registry.recordRequest(alice, 0);
        uint64 before = registry.recordParticipation(alice);
        registry.recordRequest(alice, before);
        uint64 during = registry.recordParticipation(alice);

        assertTrue(registry.canRequestWith(alice, during));
        assertFalse(registry.canRequestWith(alice, before));

        registry.recordCancel(alice);
        assertTrue(registry.canRequestWith(alice, during));
        assertTrue(registry.canRequestWith(alice, before));
    }

    // K2
    function test_RevertWhen_CancelWithoutRequest() public {
        _register(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IRegistry.NoRequestToCancel.selector, alice)
        );
        registry.recordCancel(alice);
    }

    // ---------------------------------------------------------------- fuzz

    uint256 constant ACTORS = 4;

    // K4: random Ready toggles across blocks; every past block's history matches a recomputed model.
    function testFuzz_ReadyHistory(uint8[32] calldata ops) public {
        address[ACTORS] memory actors;
        for (uint256 i = 0; i < ACTORS; i++) {
            actors[i] = makeAddr(string(abi.encode("actor", i)));
            _fund(actors[i]);
            _register(actors[i]);
        }

        uint256[] memory blocks = new uint256[](ops.length);
        uint256[] memory counts = new uint256[](ops.length);
        uint256[] memory masks = new uint256[](ops.length);
        uint256 mask;

        for (uint256 i = 0; i < ops.length; i++) {
            vm.roll(block.number + (ops[i] >> 6)); // 0..3 blocks
            uint256 who = ops[i] % ACTORS;
            bool ready = (mask >> who) & 1 == 0;
            _setReady(actors[who], ready);
            mask ^= 1 << who;

            blocks[i] = block.number;
            masks[i] = mask;
            counts[i] = _popcount(mask);
        }
        vm.roll(block.number + 1);

        for (uint256 i = 0; i < ops.length; i++) {
            // Only the last toggle within a block is visible for that block.
            if (i + 1 < ops.length && blocks[i + 1] == blocks[i]) continue;
            assertEq(registry.readyCountAt(blocks[i]), counts[i]);
            for (uint256 a = 0; a < ACTORS; a++) {
                assertEq(registry.wasReadyAt(actors[a], blocks[i]), (masks[i] >> a) & 1 == 1);
            }
        }
        assertEq(registry.readyCount(), _popcount(mask));
    }

    // Reference model for the request rule.
    struct ModelContribution {
        uint64 tag;
        uint256 opIndex;
    }

    ModelContribution[] modelContributions;
    uint256[] modelRequests; // op index of each request that was not cancelled
    bool modelOpen;
    uint256 modelParticipations;

    // K2: random request / cancel / finish / contribute / refund sequences match a simple model:
    // a proof is valid iff it was made after the member's latest non-cancelled request.
    function testFuzz_RequestRuleMatchesModel(uint8[40] calldata ops) public {
        _register(alice);

        for (uint256 i = 0; i < ops.length; i++) {
            uint256 kind = ops[i] % 5;
            if (kind == 0 && !modelOpen) {
                uint256 pick = ops[i] / 5;
                uint64 tag = modelContributions.length == 0 || pick % 4 == 0
                    ? 0
                    : modelContributions[pick % modelContributions.length].tag;
                if (_modelValid(tag)) {
                    registry.recordRequest(alice, tag);
                    modelRequests.push(i);
                    modelOpen = true;
                } else {
                    vm.expectRevert(
                        abi.encodeWithSelector(
                            IRegistry.NotEligible.selector,
                            alice
                        )
                    );
                    registry.recordRequest(alice, tag);
                }
            } else if (kind == 1 && modelOpen) {
                registry.recordCancel(alice);
                modelRequests.pop();
                modelOpen = false;
            } else if (kind == 2) {
                modelOpen = false; // the open request finished (finalized or expired)
            } else if (kind == 3) {
                uint64 tag = registry.recordParticipation(alice);
                modelContributions.push(ModelContribution(tag, i));
                modelParticipations++;
            } else if (kind == 4 && modelParticipations > 0) {
                registry.revokeParticipation(alice);
                modelParticipations--;
            }

            assertEq(registry.requestCount(alice), modelRequests.length);
            assertEq(registry.hasParticipated(alice), modelParticipations > 0);
            assertEq(registry.canRequestWith(alice, 0), _modelValid(0));
            for (uint256 c = 0; c < modelContributions.length; c++) {
                uint64 tag = modelContributions[c].tag;
                assertEq(registry.canRequestWith(alice, tag), _modelValid(tag));
            }
        }
    }

    function _modelValid(uint64 tag) internal view returns (bool) {
        if (modelRequests.length == 0) return true;
        if (tag == 0) return false;
        uint256 last = modelRequests[modelRequests.length - 1];
        for (uint256 c = 0; c < modelContributions.length; c++) {
            if (modelContributions[c].tag == tag) {
                return modelContributions[c].opIndex > last;
            }
        }
        return false;
    }

    function _popcount(uint256 x) internal pure returns (uint256 n) {
        for (; x != 0; x >>= 1) n += x & 1;
    }

    // ---------------------------------------------------------------- gas

    // K3
    function test_Gas_Register() public {
        vm.prank(alice);
        vm.startSnapshotGas("register");
        registry.register();
        vm.stopSnapshotGas();
    }

    // K3
    function test_Gas_SetReady() public {
        _fund(alice);
        _register(alice);
        vm.prank(alice);
        vm.startSnapshotGas("setReady");
        registry.setReady(true);
        vm.stopSnapshotGas();
    }

    // K3
    function test_Gas_RecordRequest() public {
        _register(alice);
        vm.startSnapshotGas("recordRequest");
        registry.recordRequest(alice, 0);
        vm.stopSnapshotGas();
    }

    // K3
    function test_Gas_RecordParticipation() public {
        _register(alice);
        vm.startSnapshotGas("recordParticipation");
        registry.recordParticipation(alice);
        vm.stopSnapshotGas();
    }
}

/// @dev Test-only handler for the Registry invariant test. Never deployed.
contract RegistryHandler is Test {
    WhitzardToken public immutable token;
    Registry public immutable registry;
    address[] public actors;

    uint256[] public blocks;
    mapping(uint256 blockNumber => uint256) public readyCountAtEnd;
    mapping(uint256 blockNumber => uint256) public registeredCountAtEnd;

    constructor(WhitzardToken token_, Registry registry_) {
        token = token_;
        registry = registry_;
        for (uint256 i = 0; i < 5; i++) {
            actors.push(makeAddr(string(abi.encode("member", i))));
        }
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    function blockCount() external view returns (uint256) {
        return blocks.length;
    }

    function register(uint256 seed) external {
        address a = actors[seed % actors.length];
        if (registry.isRegistered(a)) return;
        vm.prank(a);
        registry.register();
        _record();
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
        if (!registry.isRegistered(a)) return;
        bool ready = !registry.isReady(a);
        if (ready && token.balanceOf(a) == 0) return;
        vm.prank(a);
        registry.setReady(ready);
        _record();
    }

    function roll(uint256 n) external {
        vm.roll(block.number + bound(n, 1, 5));
        vm.warp(block.timestamp + 1 days);
    }

    function _record() internal {
        if (blocks.length == 0 || blocks[blocks.length - 1] != block.number) blocks.push(block.number);
        readyCountAtEnd[block.number] = registry.readyCount();
        registeredCountAtEnd[block.number] = registry.registeredCount();
    }
}

contract RegistryInvariantTest is Test {
    WhitzardToken token;
    Registry registry;
    RegistryHandler handler;

    function setUp() public {
        vm.roll(100);
        vm.warp(1_700_000_000);
        token = new WhitzardToken();
        registry = new Registry(IERC20(address(token)));
        handler = new RegistryHandler(token, registry);
        targetContract(address(handler));
    }

    // K4: the Ready total always equals the number of members whose status is Ready.
    function invariant_ReadyCountMatchesMembers() public view {
        uint256 ready;
        uint256 registered;
        for (uint256 i = 0; i < handler.actorCount(); i++) {
            address a = handler.actors(i);
            if (registry.isReady(a)) ready++;
            if (registry.isRegistered(a)) registered++;
            if (registry.isReady(a)) assertTrue(registry.isRegistered(a));
        }
        assertEq(registry.readyCount(), ready);
        assertEq(registry.registeredCount(), registered);
        assertLe(ready, registered);
    }

    // K4: the checkpointed totals for every past block equal the totals at the end of that block.
    function invariant_HistoryMatchesEndOfBlock() public view {
        for (uint256 i = 0; i < handler.blockCount(); i++) {
            uint256 b = handler.blocks(i);
            if (b >= block.number) continue;
            assertEq(registry.readyCountAt(b), handler.readyCountAtEnd(b));
            assertEq(registry.registeredCountAt(b), handler.registeredCountAtEnd(b));
        }
    }
}

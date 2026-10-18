# CLAUDE.md — Blockchain

Smart contracts for the thesis (see `../CLAUDE.md` for project context and `../docs/thesis.pdf` for the full design). This repo is the **main contribution**: correctness, security, and measurable gas matter most.

## Stack

- Hardhat 3 + viem, pnpm
- Solidity — pin one exact version in `hardhat.config.ts` and keep it in sync with the thesis (Bab III, Tabel 3.3)
- OpenZeppelin Contracts v5 (`ERC20`, `ERC20Permit`, `SafeERC20`, `ReentrancyGuard`, `Checkpoints`)
- **All testing is done with Hardhat 3**: Solidity tests (`*.t.sol`, forge-std cheatcodes) for unit, fuzz and invariant tests; gas via `--gas-stats` and `--snapshot`. TypeScript tests (viem) only where chain-level checks are easier (events across blocks, multi-step flows). No Foundry.
- Deployment: Hardhat Ignition to Sepolia (chain ID 11155111), RPC URL and keys from `.env` / Hardhat keystore, never committed

## Project layout

```
contracts/            production contracts (*.sol) and their unit tests (*.t.sol)
contracts/interfaces/ interfaces the backend/frontend rely on
contracts/test/       test-only contracts (mocks, attackers, baselines) — never deployed to Sepolia
test/                 TypeScript integration tests
ignition/modules/     deployment modules
scripts/              standalone scripts (`hardhat run`)
hardhat.config.ts
```

`artifacts/`, `cache/`, `node_modules/`, `.env` must be gitignored.

## Working in this project

When writing or modifying tests, configuring `hardhat.config.ts`, or interacting with the network from TypeScript, invoke the **`hardhat`** skill. It covers Solidity and TypeScript testing, `forge-std` cheatcodes, `network.create()`, `networkHelpers`, and the compile-then-typecheck workflow, and points to the matching `hardhat-toolbox-*` skill.

Docs: Hardhat 3 — https://hardhat.org/llms.txt · viem — https://viem.sh/llms.txt

## Global rules

- **No admin powers after deployment.** No `Ownable`, no pause, no proxy/upgrade, no rescue/withdraw. The only allowed setup step is a one-time wiring call that locks itself (Registry `setEscrow`).
- Custom errors, not revert strings. Every state change emits an event.
- Checks-effects-interactions wherever tokens move; `nonReentrant` on functions that transfer out.
- NatSpec on every public/external function.
- Every behavior has a test; every revert path has a test asserting the exact custom error. Tag tests with the thesis criterion they support (`// K1` … `// K4`).
- `pnpm hardhat test` must be green before calling a task done. Report gas output at the end of each task.
- Don't add dependencies without asking. Don't change event signatures without asking (the Go indexer depends on them).
- Existing Sepolia deployments in `ignition/deployments/` (Counter, old WhitzardToken) are throwaway experiments; don't build on them.

---

## 1. Token — `WhitzardToken` — DONE

> Name `Whitzard`, symbol `WHZD` (decided with the author; the thesis still says ARSN and needs updating).

ERC-20 + ERC20Permit (EIP-2612), 18 decimals. Permit exists so contributing to a request is **one transaction** (`contributeWithPermit`), not approve + contribute.

**No `mint()`, no owner, no initial supply.** The only way to get tokens is the public faucet. Rewrite the existing template contract to match this spec.

### Faucet

| Constant              | Value                    |
| --------------------- | ------------------------ |
| `FAUCET_AMOUNT`       | 100 tokens               |
| `FAUCET_COOLDOWN`     | 1 day                    |
| `FAUCET_LIFETIME_CAP` | 1,000 tokens per address |

- `faucet()` — anyone. Reverts `FaucetCooldown(uint256 nextClaimAt)` before the cooldown passes and `FaucetCapReached()` once the cap is claimed. If less than `FAUCET_AMOUNT` remains under the cap, mint only the remainder.
- Views: `claimedTotal(address)`, `nextClaimAt(address)` (0 or a past timestamp = claimable now).
- Event: `FaucetClaimed(address indexed account, uint256 amount)`.
- Constants are `public constant` so the frontend can read them.

### Tests (`contracts/WhitzardToken.t.sol`)

- name, symbol, decimals; total supply starts at 0
- first claim mints `FAUCET_AMOUNT`, emits event, updates `claimedTotal` / `nextClaimAt`
- claim within cooldown reverts with correct `nextClaimAt`; succeeds after `vm.warp`
- lifetime cap: claim up to the cap, partial final claim, then `FaucetCapReached`
- permit: valid signature sets allowance and bumps nonce; replay reverts; expired deadline reverts; wrong signer reverts
- fuzz: random claim/warp sequences never push `claimedTotal` over the cap
- invariant: `totalSupply == sum of claimedTotal` across actors (handler contract)
- gas snapshot for `faucet()` and `permit()`

---

## 2. Registry — DONE

Membership book. Read by Escrow, the indexer and the frontend; written by Escrow only for request/participation bookkeeping. Interface: `contracts/interfaces/IRegistry.sol`.

- `register()` once per address. `setReady(bool)` registered members only; turning Ready **on requires a token balance > 0** (thesis §1.3 point 3); turning it off is always allowed; setting the current value reverts `ReadyUnchanged`.
- Ready history stored with **OpenZeppelin `Checkpoints`, keyed by block number**, per member, plus checkpointed **total Ready count** and **total registered count** (the latter for the no-Ready-filter comparison, RM5). Lookups for the current or a future block revert `FutureLookup`.
- Views: `isRegistered`, `wasRegisteredAt`, `isReady`, `wasReadyAt(addr, block)`, `readyCountAt(block)`, `registeredCountAt(block)`, `readyCount`, `registeredCount`, `hasParticipated`, `canRequest`, `requestCount`, `participationsSinceLastRequest`.
- **Request rule:** every member may open their **first** request without participating. After that, they need at least one contribution to someone else's request **since their last request**. (Deliberate change from the thesis's "permanent eligibility after one contribution", which deadlocks at launch; the thesis text needs updating.)
- **Cancel and refunds (thesis KF-8/KF-9):** a refunded contribution is taken back only if it still counts toward the member's next request; one already used to open a request stays used. Cancelling one's own request restores the right to request one had before opening it (a cancelled first request is free again).
- Implementation: one packed `Member` slot per address; each request starts a new `round`, and contributions are tagged with it so a refund knows which counter to decrement.
- Escrow-only: `recordRequest(addr)`, `recordCancel(addr)`, `recordParticipation(addr) returns (uint32 round)`, `revokeParticipation(addr, round)`. These emit **no events** by design: Escrow's events record the same facts (saves gas per `contribute`).
- `setEscrow(address)` callable **once, by the deployer only**, then locked forever (solves the deploy-order loop without an owner; deployer-only prevents front-running on Sepolia).
- Events: `Registered(address indexed member)`, `ReadyChanged(address indexed member, bool ready)`, `EscrowSet(address indexed escrow)`.

## 3. Escrow — NEXT

**One singleton contract**, all requests in `mapping(uint256 => Request)` with an on-chain incrementing ID. Not one contract per request.

- Status (thesis Tabel 3.4): `Open` (no contributions yet) → `Funding` (≥ 1 contribution) → `Finalized` (deadline passed, funds sent) or `Expired` (deadline passed, nothing collected); `Cancelled` if the requester cancels before the deadline.
- `openRequest(uint256 amount, uint64 duration, bytes32 metadataHash)`
  - calls `registry.recordRequest` (reverts unless `canRequest`); one open request per requester; duration within min/max bounds
  - `snapshotBlock = block.number - 1` (prevents same-block Ready toggling)
  - `n = readyCountAt(snapshotBlock)`, minus 1 if the requester was Ready then; revert if `n == 0`
  - `share = amount / n` (floor; rounding dust accepted and documented)
  - constructor flag `useReadyFilter`: when false, use registered membership (`registeredCountAt` / `wasRegisteredAt`) instead of Ready (RM5)
- `contribute(id)` / `contributeWithPermit(id, deadline, v, r, s)`
  - before deadline, request Open/Funding, caller in snapshot, not the requester, not already contributed
  - pulls exactly `share` via `SafeERC20`; calls `registry.recordParticipation` and stores the returned round with the contribution (pack it into the "has contributed" slot)
- `cancelRequest(id)` — **requester only**, before the deadline. Status → `Cancelled`; every contributor gets exactly their contribution back; nothing goes to the requester; calls `registry.recordCancel(requester)` and `registry.revokeParticipation(member, round)` per contributor. **Open question for the Escrow task:** refund all contributors in one transaction (push, as the thesis reads) vs. each contributor claims (pull, safer pattern).
- `finalize(id)` — **anyone** after the deadline (backend keeper normally). Mark finalized **before** transfer, `nonReentrant`, send whatever was collected (possibly 0 → `Expired`). No target requirement.
- No withdraw/rescue function. Funds leave **only** through `finalize` (to the requester) or cancellation refunds (to contributors).
- Invariants (thesis): I1 pool balance of a request == its recorded contributions; I2 after `finalize` the request's pool is 0; I3 requester receives exactly the total contributed; I4 no double contribution per member per request; I5 on cancellation the refunds equal the total contributed and nothing reaches the requester.
- Events (indexer depends on these):
  `RequestOpened(uint256 indexed id, address indexed requester, uint256 amount, uint256 share, uint256 snapshotBlock, uint64 deadline, bytes32 metadataHash)`,
  `Contributed(uint256 indexed id, address indexed member, uint256 amount)`,
  `RequestFinalized(uint256 indexed id, address indexed requester, uint256 total)`,
  plus cancellation/refund events — names and fields to be agreed in the Escrow task.

## 4. Test-only contracts — NOT YET, context only

In `contracts/test/`:

- `DirectTransferBaseline` — non-escrow gas baseline (RM4).
- `NaiveSnapshotEscrow` — loops over Ready members in `openRequest`; shows linear gas growth and the block-gas-limit ceiling vs. the checkpoint design (RM4c).
- Reentrancy (RM3): `HookToken` (ERC-20 with a receiver hook on transfer), `VulnerableEscrow` (state updated after transfer, no guard), `ReentrancyAttacker`. Tests must show the attack **drains `VulnerableEscrow`** and **fails against `Escrow`**.

## Thesis evaluation criteria (Tabel 1.1)

- **K1 Functional** — normal flow passes; requester receives exactly the recorded total.
- **K2 Robustness** — reentrancy fails; late contributions rejected; partial funding still released; cancellation refunds every contributor exactly; nobody but Escrow moves pooled funds.
- **K3 Cost & time** — gas per function and per full cycle vs. direct transfer; snapshot scaling vs. block gas limit; Sepolia confirmation time.
- **K4 Ready status** — snapshot size, gas per cycle, contribution-value-to-gas ratio, with vs. without the Ready filter.

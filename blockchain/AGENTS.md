# CLAUDE.md — Blockchain

Smart contracts for Whitzard (see `../CLAUDE.md` for project context; this file is the full design). This repo is the **core of the project**: correctness, security, and measurable gas matter most.

## Stack

- Hardhat 3 + viem, pnpm
- Solidity — pin one exact version in `hardhat.config.ts`
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
- Every behavior has a test; every revert path has a test asserting the exact custom error. Tag tests with the evaluation criterion they support (`// K1` … `// K4`).
- `pnpm hardhat test` must be green before calling a task done. Report gas output at the end of each task.
- Don't add dependencies without asking. Don't change event signatures without asking (the Go indexer depends on them).
- Live Sepolia deployment: `ignition/deployments/chain-11155111` (Token, Registry, Escrow with the Ready filter; addresses in `README.md`). The backend and frontend env files point at it — don't redeploy over it without asking.

---

## 1. Token — `WhitzardToken` — DONE

> Name `Whitzard`, symbol `WHZD`.

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

- `register()` once per address. `setReady(bool)` registered members only; turning Ready **on requires a token balance > 0**; turning it off is always allowed; setting the current value reverts `ReadyUnchanged`.
- Ready history stored with **OpenZeppelin `Checkpoints`, keyed by block number**, per member, plus checkpointed **total Ready count** and **total registered count** (the latter for the no-Ready-filter comparison). Lookups for the current or a future block revert `FutureLookup`.
- Views: `isRegistered`, `wasRegisteredAt`, `isReady`, `wasReadyAt(addr, block)`, `readyCountAt(block)`, `registeredCountAt(block)`, `readyCount`, `registeredCount`, `hasParticipated`, `canRequestWith(addr, proofTag)`, `requestCount`, `currentTag`.
- **Request rule:** every member may open their **first** request without participating. After that, they need at least one contribution to someone else's request **since their last request**. (Chosen over "permanent eligibility after one contribution", which deadlocks at launch.)
- **Proof model:** the requester names one contribution as proof (`proofId` on `openRequest`). Escrow checks it exists, was not refunded and its request is not Cancelled, then passes its tag; the Registry checks the tag's round is `>= floor` (made since the last request). So cancelling a request invalidates every contribution to it as proof **immediately, without a loop**, even before refunds are claimed. A proof already used to open a request stays used if its request is cancelled later (documented edge case).
- Cancelling one's own request restores the floor from before it (a cancelled first request is free again; the used proof counts again).
- Implementation: one packed `Member` slot per address; each request starts a new `round`; contributions get tag `round + 1` (never 0).
- Escrow-only: `recordRequest(addr, proofTag)`, `recordCancel(addr)`, `recordParticipation(addr) returns (uint64 tag)`, `revokeParticipation(addr)` (only updates `hasParticipated`, on refund claim). These emit **no events** by design: Escrow's events record the same facts (saves gas per `contribute`).
- `setEscrow(address)` callable **once, by the deployer only**, then locked forever (solves the deploy-order loop without an owner; deployer-only prevents front-running on Sepolia).
- Events: `Registered(address indexed member)`, `ReadyChanged(address indexed member, bool ready)`, `EscrowSet(address indexed escrow)`.

## 3. Escrow — DONE

**One singleton contract**, all requests in `mapping(uint256 => Request)` (4 packed slots) with an on-chain incrementing ID starting at 1. Interface: `contracts/interfaces/IEscrow.sol`.

- Status, from `status(id)`: `Open` (no contributions, before deadline) → `Funding` (≥ 1 contribution; also after the deadline until `finalize`) → `Finalized` (funds sent) or `Expired` (deadline passed with nothing collected); `Cancelled` by the requester before the deadline.
- `MIN_DURATION = 5 minutes`, `MAX_DURATION = 30 days` (inclusive).
- `openRequest(uint256 amount, uint64 duration, bytes32 evidenceHash, uint256 proofId)`
  - `evidenceHash` = SHA-256 of the evidence document; `proofId` = a request the caller contributed to since their last request, `0` for none (first request)
  - one open request per requester (`latestRequestOf`); after its deadline a new one may be opened even before `finalize`
  - `snapshotBlock = block.number - 1`; `n = readyCountAt(snapshotBlock)`, minus 1 if the requester was Ready then; revert `EmptySnapshot` if `n == 0`
  - `share = amount / n` (floor; rounding dust accepted and documented); revert `ShareTooSmall` if 0
  - constructor flag `useReadyFilter`: when false, use `registeredCountAt` / `wasRegisteredAt` instead. A Registry is wired to exactly one Escrow, so the comparison needs a second Registry.
- `contribute(id)` / `contributeWithPermit(id, permitDeadline, v, r, s)`
  - before deadline, request Active, caller in snapshot, not the requester, not already contributed
  - pulls exactly `share` via `SafeERC20`; stores the Registry tag with the contribution
  - the permit call is wrapped in try/catch, so a front-run permit cannot block the contribution
- `cancelRequest(id)` — **requester only**, before the deadline. Status → `Cancelled`; calls `registry.recordCancel`; **moves no funds**.
- `claimRefund(id)` — **the contributor only**, after a cancel; pays back exactly their share; calls `registry.revokeParticipation`.
- `finalize(id)` — **anyone** after the deadline (backend keeper normally). State set **before** transfer, `nonReentrant`; sends whatever was collected (0 → `Expired`). No target requirement.
- Views for backend/frontend: `getRequest`, `status`, `canFinalize` (keeper), `canContribute`, `isInSnapshot`, `contributionOf`, `canOpenRequest(member, proofId)`, `pendingRefund(id, member)`, `pendingRefunds(member, ids[])` (UI: ids from the member's `Contributed` logs; no on-chain per-member list, to keep `contribute` cheap).
- No withdraw/rescue function. Funds leave **only** through `finalize` (to the requester) or `claimRefund` (to contributors).
- Invariants: I1 escrow balance == Σ (collected − refunds·share) over open/cancelled requests; I2 finalized requests hold nothing; I3 requester receives exactly the total contributed; I4 no double contribution per member per request; I5 a cancelled request pays its requester nothing and refunds never exceed contributions.
- Events (indexer depends on these):
  `RequestOpened(uint256 indexed id, address indexed requester, uint256 amount, uint256 share, uint256 snapshotBlock, uint64 deadline, bytes32 evidenceHash)`,
  `Contributed(uint256 indexed id, address indexed member, uint256 amount)`,
  `RequestFinalized(uint256 indexed id, address indexed requester, uint256 total)`,
  `RequestCancelled(uint256 indexed id, address indexed requester, uint256 total)`,
  `Refunded(uint256 indexed id, address indexed member, uint256 amount)`

## 4. Test-only contracts — DONE

In `contracts/test/` (never deployed to Sepolia), tested in `contracts/Reentrancy.t.sol` and `contracts/Baselines.t.sol`:

- `DirectTransferBaseline` — non-escrow gas baseline: `send(to, amount)` = `transferFrom` member → requester + event.
- `NaiveSnapshotEscrow` — own member list; `openRequest` loops over it and stores every Ready member. ~27,100 gas per member: **614 members max** under the EIP-7825 per-transaction cap (2^24 = 16,777,216 gas, Osaka/Fusaka, live on Sepolia), which binds before any block gas limit. Escrow's `openRequest` stays ~181–195k gas at any size.
- Reentrancy: `HookToken` (ERC-20 calling opted-in receivers after each transfer; anyone can mint), `VulnerableEscrow` (finalize pays before marking finalized, no guard), `ReentrancyAttacker` (re-enters `finalize` / `claimRefund` from the callback; can swallow the failure). Shown: the attack **drains `VulnerableEscrow`** (owed 1 share, took 4); against `Escrow` it reverts the payout, or, if swallowed, the attacker gets exactly what it is owed, once.

### Gas report — `scripts/gas-report.ts`

`pnpm hardhat run scripts/gas-report.ts` measures **real transaction gas** (receipt `gasUsed`, incl. 21,000 intrinsic + calldata) on the local simulated network and writes `reports/gas-report.md` / `.json`: K3a per function, K3b full cycle vs direct transfer (1/3/10/50 contributors), K3c snapshot scaling (10–1000 members, with the ceiling checked on-chain), K4a/b with vs without the Ready filter. K4c (value/gas ratio) needs `REF_GAS_PRICE_GWEI`, `REF_ETH_PRICE`, `REF_TOKEN_PRICE` (reference prices). Still open: K3d Sepolia confirmation time (needs a live deployment).

## Evaluation criteria

- **K1 Functional** — normal flow passes; requester receives exactly the recorded total.
- **K2 Robustness** — reentrancy fails; late contributions rejected; partial funding still released; cancellation refunds every contributor exactly; nobody but Escrow moves pooled funds.
- **K3 Cost & time** — gas per function and per full cycle vs. direct transfer; snapshot scaling vs. block gas limit; Sepolia confirmation time.
- **K4 Ready status** — snapshot size, gas per cycle, contribution-value-to-gas ratio, with vs. without the Ready filter.

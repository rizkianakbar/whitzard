# Whitzard — Smart Contracts

The on-chain part of [Whitzard](../README.md), and the main contribution of the thesis.

**Stack:** Solidity 0.8.37 · OpenZeppelin Contracts 5.7 · Hardhat 3 · viem · pnpm

## Contracts

| Contract        | Role                                                               | Status      |
| --------------- | ------------------------------------------------------------------ | ----------- |
| `WhitzardToken` | ERC-20 + permit (EIP-2612). The only source of tokens is a faucet. | Done        |
| `Registry`      | Membership book and Ready history (block-number checkpoints)       | Done        |
| `Escrow`        | Requests, snapshot, contributions, payout, cancel and refunds      | Done        |

There are no admin powers anywhere: no owner, no pause, no upgrade, no withdraw.

### WhitzardToken (`WHZD`)

There is no `mint()`, no owner, and the supply starts at 0. Tokens come only from the faucet:

| Rule         | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| Per claim    | 100 WHZD                                                       |
| Cooldown     | 1 day per address                                              |
| Lifetime cap | 1,000 WHZD per address; the last claim gets only the remainder |

| Function / view                  | Notes                                                         |
| -------------------------------- | ------------------------------------------------------------- |
| `faucet()`                       | Reverts `FaucetCooldown(nextClaimAt)` or `FaucetCapReached()` |
| `claimedTotal(address)`          | Total claimed so far                                          |
| `nextClaimAt(address)`           | `0` or a past timestamp means the address can claim now       |
| `permit(...)`                    | Approve by signature, so contributing takes one transaction   |
| `FaucetClaimed(account, amount)` | Event, read by the backend indexer                            |

### Registry

Interface: [`contracts/interfaces/IRegistry.sol`](contracts/interfaces/IRegistry.sol).

- **Join:** `register()` once. Then `setReady(true / false)`; turning Ready on requires holding WHZD.
- **History:** Ready status, the Ready total and the registered total are checkpointed per block, so
  Escrow reads the snapshot at `block.number - 1` without looping over members
  (`wasReadyAt`, `readyCountAt`, `registeredCountAt`). The current block can't be looked up.
- **Right to request:** the first request is free. After that you name one contribution to someone
  else's request, made since your last one, as proof (Escrow's `canOpenRequest`). Contributions to
  a cancelled request stop counting right away, and cancelling your own request gives back the
  right you had before opening it.
- **Escrow-only:** `recordRequest`, `recordCancel`, `recordParticipation`, `revokeParticipation`.
  The Escrow address is wired once by the deployer (`setEscrow`) and then locked forever.
- **Events:** `Registered(member)`, `ReadyChanged(member, ready)`, `EscrowSet(escrow)`.

### Escrow

Interface: [`contracts/interfaces/IEscrow.sol`](contracts/interfaces/IEscrow.sol).

| Step       | Function                                                     | Who                      | When                 |
| ---------- | ------------------------------------------------------------ | ------------------------ | -------------------- |
| Open       | `openRequest(amount, duration, evidenceHash, proofId)`       | a member with the right  | duration 5 min–30 days |
| Contribute | `contribute(id)` or `contributeWithPermit(id, …)` (1 tx)     | members in the snapshot  | before the deadline  |
| Finalize   | `finalize(id)`: everything collected goes to the requester   | anyone (backend keeper)  | after the deadline   |
| Cancel     | `cancelRequest(id)`: moves no funds                          | the requester            | before the deadline  |
| Refund     | `claimRefund(id)`: exactly your share back                   | each contributor         | after a cancel       |

- **Snapshot:** the Ready members at `block.number - 1`, minus the requester. `share = amount / n`,
  rounded down. With `useReadyFilter = false`, every registered member counts instead (RM5).
- **Status:** `Open` → `Funding` → `Finalized` or `Expired` (nothing collected), or `Cancelled`.
- **Pending refunds for the UI:** `pendingRefunds(member, ids)`, with the ids taken from the
  member's `Contributed` logs.
- **Events:** `RequestOpened`, `Contributed`, `RequestFinalized`, `RequestCancelled`, `Refunded`.

### Test-only contracts (`contracts/test/`, never deployed)

| Contract                 | Used for                                                                        |
| ------------------------ | ------------------------------------------------------------------------------- |
| `DirectTransferBaseline` | K3: the non-escrow baseline (each member sends straight to the requester)       |
| `NaiveSnapshotEscrow`    | K3c: snapshot by looping over members, gas grows ~27,100 per member             |
| `HookToken`              | RM3: an ERC-20 that calls the receiver back, so it can re-enter                 |
| `VulnerableEscrow`       | RM3: pays before recording it, no guard; the attack drains it                   |
| `ReentrancyAttacker`     | RM3: re-enters `finalize` / `claimRefund`; fails against `Escrow`               |

## Gas report

```shell
pnpm hardhat run scripts/gas-report.ts      # writes reports/gas-report.md and .json
```

Real transaction gas for the thesis tables: per function, full cycle vs direct transfer, `openRequest`
vs snapshot size (the naive design stops fitting in one transaction at 614 members, because of the
EIP-7825 per-transaction cap of 16,777,216 gas), and with vs without the Ready filter. For the
value-to-gas ratio (K4c), also set `REF_GAS_PRICE_GWEI`, `REF_ETH_PRICE` and `REF_TOKEN_PRICE`.

## Setup

```shell
pnpm install
pnpm hardhat build
```

## Test

```shell
pnpm hardhat test               # everything
pnpm hardhat test solidity      # unit, fuzz, invariant
pnpm hardhat test nodejs        # TypeScript integration tests
pnpm hardhat test --gas-stats   # gas per function
pnpm hardhat test --snapshot    # write .gas-snapshot and snapshots/
pnpm hardhat test --coverage
```

| Layer                | Where               | Covers                                                            |
| -------------------- | ------------------- | ----------------------------------------------------------------- |
| Solidity (forge-std) | `contracts/*.t.sol` | Every behavior and revert, fuzz and invariants (10,000 runs each) |
| TypeScript (viem)    | `test/*.ts`         | Chain-level flows: events across blocks, wallet-signed permits    |

Tests are tagged with the thesis evaluation criteria (`// K1` … `// K4`):
**K1** functional · **K2** robustness · **K3** cost and time · **K4** effect of the Ready status.

## Deploy to Sepolia

Live deployment (chain ID 11155111, `ignition/deployments/chain-11155111`, Ready filter on):

| Contract      | Address                                      | Block    |
| ------------- | -------------------------------------------- | -------- |
| WhitzardToken | `0x903709b3c1849BD243682D1Ba254767B93E37449` | 11940135 |
| Registry      | `0xED0466f45E9aD8593315D8eFd648E4C236cb3105` | 11944936 |
| Escrow        | `0x2e902611e0Ab6Ae51BA191608b8FcA89487484AF` | 11944988 |

`Registry.setEscrow` was called at block 11944994. The backend indexer starts at `START_BLOCK=11944936`.

Store the secrets in the Hardhat keystore (or as environment variables). They are never committed.

```shell
pnpm hardhat keystore set SEPOLIA_RPC_URL
pnpm hardhat keystore set SEPOLIA_PRIVATE_KEY
pnpm hardhat keystore set ETHERSCAN_API_KEY      # only for verification
```

```shell
pnpm hardhat ignition deploy ignition/modules/Escrow.ts                            # local dry run (full stack)
pnpm hardhat ignition deploy ignition/modules/Escrow.ts --network sepolia
pnpm hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

## Claim from the faucet

```shell
pnpm hardhat run scripts/faucet.ts                                         # local: deploys a fresh token first
TOKEN_ADDRESS=0x... pnpm hardhat run scripts/faucet.ts --network sepolia
```

## Layout

```
contracts/            contracts and their Solidity tests (*.t.sol)
contracts/interfaces/ interfaces the backend and frontend rely on
contracts/test/       test-only contracts (mocks, attackers, baselines), never deployed
test/                 TypeScript integration tests
ignition/modules/     deployment modules
scripts/              hardhat run scripts
```

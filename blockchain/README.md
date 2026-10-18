# Whitzard — Smart Contracts

The on-chain part of [Whitzard](../README.md), and the main contribution of the thesis.

**Stack:** Solidity 0.8.37 · OpenZeppelin Contracts 5.7 · Hardhat 3 · viem · pnpm

## Contracts

| Contract        | Role                                                               | Status      |
| --------------- | ------------------------------------------------------------------ | ----------- |
| `WhitzardToken` | ERC-20 + permit (EIP-2612). The only source of tokens is a faucet. | Done        |
| `Registry`      | Membership book and Ready history (block-number checkpoints)       | Done        |
| `Escrow`        | Requests, snapshot, contributions, automatic payout                | Not started |

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
- **Right to request:** the first request is free. After that you need one contribution to someone
  else's request since your last one (`canRequest`). A refunded contribution stops counting, and
  cancelling your own request gives back the right you had before opening it.
- **Escrow-only:** `recordRequest`, `recordCancel`, `recordParticipation`, `revokeParticipation`.
  The Escrow address is wired once by the deployer (`setEscrow`) and then locked forever.
- **Events:** `Registered(member)`, `ReadyChanged(member, ready)`, `EscrowSet(escrow)`.

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

Store the secrets in the Hardhat keystore (or as environment variables). They are never committed.

```shell
pnpm hardhat keystore set SEPOLIA_RPC_URL
pnpm hardhat keystore set SEPOLIA_PRIVATE_KEY
pnpm hardhat keystore set ETHERSCAN_API_KEY      # only for verification
```

```shell
pnpm hardhat ignition deploy ignition/modules/Registry.ts                          # local dry run (Token + Registry)
pnpm hardhat ignition deploy ignition/modules/Registry.ts --network sepolia
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

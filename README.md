# Whitzard

**Automated escrow smart contract for transparent community health aid.**

A member asks for help. Every member who is _Ready_ at that moment chips in the same fixed share.
An Escrow contract holds the money and pays it to the requester when the request's time is up.
No admin, no voting, no manual approval: the rules are the code, and every step is on-chain.

## How it works

1. **Get tokens.** Members claim test tokens from the public faucet.
2. **Register and go Ready.** Members choose whether they're counted for new requests.
3. **Open a request.** The requester sets the amount and duration and attaches a hash of the evidence document.
   The contract snapshots the Ready members and computes the share: `amount / n`.
4. **Contribute.** Each member in the snapshot pays exactly one share, in one transaction (EIP-2612 permit).
5. **Finalize.** After the deadline anyone can call `finalize()`, and the requester receives everything collected,
   even if the request was only partly funded.
6. **Or cancel.** Before the deadline the requester can cancel, and each contributor claims their share back.

## Repository

| Folder                       | What                                                    | Stack                       | Status         |
| ---------------------------- | ------------------------------------------------------- | --------------------------- | -------------- |
| [`blockchain/`](blockchain/) | Token, Registry, Escrow contracts + tests               | Solidity, Hardhat 3, viem   | Contracts done |
| [`backend/`](backend/)       | REST API, event indexer, `finalize()` keeper, evidence  | Go, go-ethereum, PostgreSQL | Done           |
| [`frontend/`](frontend/)     | Demo UI: wallet sign-in, requests, history, dashboard   | Next.js, wagmi              | Working demo   |

The backend never holds member keys or moves funds. Users sign every transaction in their own wallet.

**Network:** Sepolia testnet (chain ID `11155111`). The tokens have no real value.

## Quick start

Contracts and their tests:

```shell
cd blockchain
pnpm install
pnpm hardhat test
```

The whole stack on a local chain (PostgreSQL in Docker, Hardhat node, contracts, backend):

```shell
cd backend && ./scripts/dev.sh        # runs until Ctrl-C
cd frontend && pnpm install && pnpm dev   # in another terminal → http://localhost:3000
```

Against Sepolia instead, see [`backend/README.md`](backend/README.md) and
[`frontend/README.md`](frontend/README.md). Contracts in depth: [`blockchain/README.md`](blockchain/README.md).

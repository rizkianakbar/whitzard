# Whitzard

**Automated escrow smart contract for transparent community health aid.**
Skripsi project, Computer Science, Binus University.

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

| Folder                       | What                                         | Stack                       | Status      |
| ---------------------------- | -------------------------------------------- | --------------------------- | ----------- |
| [`blockchain/`](blockchain/) | Token, Registry, Escrow contracts + tests    | Solidity, Hardhat 3, viem   | Contracts done       |
| [`backend/`](backend/)       | REST API, event indexer, `finalize()` keeper | Go, go-ethereum, PostgreSQL | Done        |
| `frontend/`                  | Demo UI and wallet connection                | Next.js, wagmi              | Not started |
| [`docs/`](docs/)             | [Thesis](docs/thesis.pdf): the design source of truth |                    |             |

The backend never holds member keys or moves funds. Users sign every transaction in their own wallet.

**Network:** Sepolia testnet (chain ID `11155111`). The tokens have no real value.

## Quick start

```shell
cd blockchain
pnpm install
pnpm hardhat test
```

Full guide: [`blockchain/README.md`](blockchain/README.md).

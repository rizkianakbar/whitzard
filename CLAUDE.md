# CLAUDE.md — Whitzard

Skripsi project: **"Development of an Automated Escrow Smart Contract for Transparent Community Health Aid Disbursement"** (Binus University, Computer Science).

Members chip in a fixed, equal share to fund a health-aid request from another member. Funds are held by an Escrow smart contract and released to the requester automatically after the request's duration ends — no admin, no voting, no manual approval.

The full thesis is in `docs/thesis.pdf`. It is the source of truth for design decisions. If code or a CLAUDE.md disagrees with the thesis, **stop and ask** — don't silently pick one.

## Repos

| Folder        | Role                                                                                              | Stack                       |
| ------------- | ------------------------------------------------------------------------------------------------- | --------------------------- |
| `blockchain/` | **Main thesis contribution.** Token, Registry, Escrow contracts + tests                           | Solidity, Hardhat 3, viem   |
| `backend/`    | Demo support: REST API, event indexer, keeper that calls `finalize()`, off-chain evidence storage | Go, go-ethereum, PostgreSQL |
| `frontend/`   | Demo support: minimal UI, wallet connection                                                       | Next.js, wagmi              |

Each folder has its own CLAUDE.md with details. Work in one folder at a time unless asked otherwise.

## Cross-repo rules

- The backend never holds member keys or moves member funds. State-changing transactions are signed by the user's wallet and sent straight to the chain.
- Contract **event signatures and function interfaces** are the contract between repos. Changing them requires updating the other repos — ask before changing.
- Network: Sepolia (chain ID 11155111). Secrets (RPC URLs, private keys) only in `.env`, never committed.

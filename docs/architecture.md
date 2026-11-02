# Architecture

Whitzard has three parts. The **contracts** hold the rules and the money. The **backend** and
**frontend** only make the contracts easier to use: if both disappeared, every request could still
be contributed to, finalized and refunded straight from a wallet or Etherscan.

```mermaid
flowchart LR
    subgraph Browser
        UI["Frontend<br/>Next.js · wagmi"]
        W["Wallet<br/>MetaMask"]
    end

    subgraph Sepolia["Sepolia testnet"]
        T["WhitzardToken<br/>ERC-20 + permit + faucet"]
        R["Registry<br/>members · Ready history"]
        E["Escrow<br/>requests · funds"]
    end

    subgraph Backend["Backend (Go)"]
        API["API<br/>REST + WebSocket"]
        IDX["Indexer"]
        K["Keeper"]
        DB[("PostgreSQL")]
    end

    UI -- "reads data" --> API
    UI -- "asks to sign" --> W
    W -- "signs and sends every transaction" --> E
    W --> R
    W --> T
    E -- "reads snapshot" --> R
    E -- "moves tokens" --> T
    IDX -- "reads events" --> E
    IDX -- "reads events" --> R
    IDX --> DB
    API --> DB
    K -- "finalize(id) after the deadline" --> E
```

| Part                               | Responsibility                                                                      | Trust                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `WhitzardToken`                    | Test ERC-20 with EIP-2612 permit and a public faucet. No owner, no mint.             | None needed: fixed rules                                    |
| `Registry`                         | Who is a member, and who was _Ready_ at every past block                             | None needed: fixed rules                                    |
| `Escrow`                           | Opens requests, takes contributions, pays out, refunds. The only holder of funds.   | None needed: fixed rules, no admin                          |
| Indexer                            | Mirrors contract events into PostgreSQL and creates notifications                   | Read-only; anyone can rebuild it from the chain            |
| API                                | Sign-in (SIWE), profiles, evidence files, request lists, notifications              | Holds no keys, moves no funds                               |
| Keeper                             | Calls `finalize(id)` once a funded request's time is up                             | Its wallet only pays gas; anyone else can call it too      |
| Frontend                           | The UI; builds transactions for the member's wallet to sign                         | Holds no keys                                               |

## A request, end to end

```mermaid
sequenceDiagram
    actor A as Requester
    actor M as Member
    participant API as Backend
    participant E as Escrow
    participant R as Registry

    A->>API: Upload evidence document
    API-->>A: SHA-256 of the document
    A->>E: openRequest(amount, duration, evidenceHash, proofId)
    E->>R: Ready count at the previous block
    Note over E: share = amount / n, deadline = now + duration
    E-->>API: RequestOpened event (indexer)
    API-->>M: Notification (WebSocket, email)
    M->>API: Download evidence, check it against the on-chain hash
    M->>E: contributeWithPermit(id, …) — one signature, one transaction
    Note over E: Holds exactly one share per member
    Note over API,E: …the collection period ends…
    API->>E: finalize(id) by the keeper, or anyone
    E-->>A: Everything collected
```

If the requester cancels before the deadline, nothing is paid out. Each contributor calls
`claimRefund(id)` to take back exactly their share.

## Request status

```mermaid
stateDiagram-v2
    [*] --> Open: openRequest
    Open --> Funding: first contribution
    Open --> Expired: deadline, nothing collected
    Open --> Cancelled: requester cancels
    Funding --> Funding: more contributions
    Funding --> Cancelled: requester cancels (before deadline)
    Funding --> Finalized: finalize() after deadline
    Cancelled --> [*]: contributors claim refunds
    Finalized --> [*]
    Expired --> [*]
```

## What lives where

| On-chain (public, permanent)                          | Off-chain in PostgreSQL (backend)                          |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| Membership and _Ready_ history                        | Profiles: name, city, photo, email                         |
| Request amount, share, deadline, snapshot block       | Request title and story                                    |
| SHA-256 of the evidence document                      | The evidence document itself                               |
| Every contribution, payout and refund                 | Notifications, comments, "declined" answers                |

Anything that decides who gets paid is on-chain. Personal data stays off-chain, and the evidence is
tied to the chain by its hash, so the backend can serve the document but cannot swap it.

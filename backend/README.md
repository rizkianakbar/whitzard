# Whitzard — Backend

Demo-support backend for [Whitzard](../README.md): mirrors the contracts into PostgreSQL, stores
evidence documents off-chain, serves the frontend, and finalizes due requests.

**It never holds member keys or moves member funds.** Members sign every transaction in their
own wallet; the API only serves data.

**Stack:** Go · go-ethereum · PostgreSQL (pgx) · coder/websocket

## Run

```shell
docker compose up -d                   # PostgreSQL on 127.0.0.1:5433
cp .env.example .env                   # fill in RPC_URL, contract addresses, START_BLOCK
go run ./cmd/whitzard all              # indexer + API + keeper (or: indexer | api | keeper | migrate)
```

| Part | What it does |
| --- | --- |
| indexer | mirrors Registry + Escrow events into PostgreSQL, rebuilds each snapshot, creates notifications |
| api | REST + WebSocket for the frontend (below) |
| keeper | sends `finalize()` for funded requests past their deadline, from its own wallet (`KEEPER_PRIVATE_KEY`), which only pays gas; empty requests expire without a transaction |

## Test

```shell
docker compose up -d
go test ./...              # unit + integration (simulated chain, real PostgreSQL)
./scripts/e2e.sh           # full stack: Hardhat node, deploy, `whitzard all`, scripted user flow
```

`e2e.sh` runs `../blockchain/scripts/e2e-flow.ts`: four members sign in with their wallets, a
request is opened with an uploaded document, members are notified live, respond and contribute
(one with a permit), the keeper finalizes after the deadline, and a cancelled request is refunded.

Tests run against a fresh database each and go-ethereum's simulated chain with the real compiled
contracts. After a contract change: `(cd ../blockchain && pnpm hardhat build) && ./scripts/gen-bindings.sh`.

## API

Amounts are decimal strings in the token's smallest unit (18 decimals). Addresses are lowercase.
Errors are `{"error": "…"}`. 🔒 = needs `Authorization: Bearer <token>`.

### Sign in (Sign-In with Ethereum, EIP-4361)

| | |
| --- | --- |
| `GET /auth/nonce?address=0x…` | `{nonce, message, expiresAt}`: have the wallet `personal_sign` exactly `message` |
| `POST /auth/verify` `{address, nonce, signature}` | `{token, address, expiresAt}`; a nonce works once |
| `POST /auth/logout` 🔒 | ends the session |

### Members

| | |
| --- | --- |
| `GET /members` 🔒 | `{members: [profile]}`: every registered member, ready ones first (profiles only; chain state per member) |
| `GET /members/{address}` (or `/members/me` 🔒) | `{address, profile, chain}`: profile is null before registering; `chain` = registered, ready, hasParticipated, requestCount, balance, faucetClaimed, faucetNextClaimAt (live) |
| `PUT /members/me` 🔒 `{displayName, nickname, birthDate, city, email}` | replace the profile (registered members); missing fields are cleared, `birthDate` is `YYYY-MM-DD`, `email` is used for email notifications. Self-declared, never verified. `birthDate` and `email` are returned only to the member themself, `city` only to signed-in viewers |
| `PUT /members/me/photo` 🔒 multipart `file` | set the profile photo (PNG, JPEG or WebP, `MAX_PHOTO_BYTES`); `profile.photo` is its SHA-256 |
| `DELETE /members/me/photo` 🔒 | remove the profile photo |
| `GET /members/{address}/photo` 🔒 | the photo, for signed-in viewers |
| `GET /stats` | `{members, readyMembers, requests, funded, distributed, contributions}`: community totals for the public landing page |
| `GET /members/me/proof` 🔒 | `{needed, proofId, canOpenRequest}`: the `proofId` to pass to `openRequest` |
| `GET /members/me/refunds` 🔒 | `{total, refunds: [{requestId, amount}]}`: claimable with `claimRefund` |
| `GET /members/me/stats` 🔒 | `{helped, given, refunded, requests, funded, received}`: the caller's own totals for the dashboard |

### Requests

| | |
| --- | --- |
| `POST /requests` 🔒 multipart `title`, `description`, `file` | `{draftId, evidenceHash, …}`: then send `Escrow.openRequest(amount, duration, evidenceHash, proofId)` from the wallet |
| `GET /requests?requester=&member=me&before=&limit=` 🔒 | newest first; with `member=me` each request also has `yourResponse` |
| `GET /requests/{id}` 🔒 | `{request, responses, comments, you}`: `status` is open / funding / finalized / expired / cancelled, plus `awaitingFinalize` |
| `POST /requests/{id}/comments` 🔒 `{body}` | add one discussion comment (`body` max 1000 chars) |
| `GET /requests/{id}/activity` 🔒 | `{activity: [{type, member, amount, txHash, at}]}`: contributions and refunds, oldest first; `type` is contributed / refunded. Who declined or did not answer is only counted, never named |
| `GET /requests/{id}/evidence` 🔒 | the document, only for the requester and snapshot members; `X-Evidence-Sha256` = on-chain hash |
| `POST /requests/{id}/contribute` 🔒 `{response: "participate" \| "decline"}` | records the answer; the contribution itself is `Escrow.contributeWithPermit` from the wallet |

### Notifications

| | |
| --- | --- |
| `GET /notifications?unread=true&limit=` 🔒 | newest first |
| `POST /notifications/{id}/read` 🔒 | mark as read |
| `GET /ws?token=<token>` | WebSocket: each new notification is pushed as JSON |

Types: `request_opened`, `contribution_received`, `request_cancelled`, `request_finalized` (to the requester), `request_forwarded` (to the contributors), `request_expired`. `amount` (wei, or null) is the share asked for, the contribution received, or the total paid out; `title` and `description` are Indonesian text, kept for clients that do not write their own. When SMTP is configured (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`), each new notification is also sent to the member email in their profile.

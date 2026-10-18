# Whitzard — Backend

Demo-support backend for [Whitzard](../README.md): mirrors the contracts into PostgreSQL, stores
evidence documents off-chain, serves the frontend, and (soon) finalizes due requests.

**It never holds member keys or moves member funds.** Members sign every transaction in their
own wallet; the API only serves data.

**Stack:** Go · go-ethereum · PostgreSQL (pgx) · coder/websocket

## Run

```shell
docker compose up -d                   # PostgreSQL on 127.0.0.1:5433
cp .env.example .env                   # fill in RPC_URL, contract addresses, START_BLOCK
go run ./cmd/whitzard all              # indexer + API (or: indexer | api | migrate)
```

## Test

```shell
docker compose up -d
go test ./...
```

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
| `GET /members/{address}` (or `/members/me` 🔒) | `{address, profile, chain}`: profile is null before registering; `chain` = registered, ready, hasParticipated, requestCount, balance, faucetClaimed, faucetNextClaimAt (live) |
| `PUT /members/me` 🔒 `{displayName}` | edit the profile (registered members) |
| `GET /members/me/proof` 🔒 | `{needed, proofId, canOpenRequest}`: the `proofId` to pass to `openRequest` |
| `GET /members/me/refunds` 🔒 | `{total, refunds: [{requestId, amount}]}`: claimable with `claimRefund` |

### Requests

| | |
| --- | --- |
| `POST /requests` 🔒 multipart `title`, `description`, `file` | `{draftId, evidenceHash, …}`: then send `Escrow.openRequest(amount, duration, evidenceHash, proofId)` from the wallet |
| `GET /requests?requester=&member=me&before=&limit=` | newest first |
| `GET /requests/{id}` | `{request, responses, you?}`: `status` is open / funding / finalized / expired / cancelled, plus `awaitingFinalize` |
| `GET /requests/{id}/evidence` 🔒 | the document, only for the requester and snapshot members; `X-Evidence-Sha256` = on-chain hash |
| `POST /requests/{id}/contribute` 🔒 `{response: "participate" \| "decline"}` | records the answer; the contribution itself is `Escrow.contributeWithPermit` from the wallet |

### Notifications

| | |
| --- | --- |
| `GET /notifications?unread=true&limit=` 🔒 | newest first |
| `POST /notifications/{id}/read` 🔒 | mark as read |
| `GET /ws?token=<token>` | WebSocket: each new notification is pushed as JSON |

Types: `request_opened`, `contribution_received`, `request_cancelled`, `request_finalized`, `request_expired`.

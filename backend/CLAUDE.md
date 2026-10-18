# CLAUDE.md — Backend

Demo-support backend for the thesis (see `../CLAUDE.md` and `../docs/thesis.pdf` §3.3). Not the
main contribution — keep it simple, correct and well tested — but it must never weaken the
contracts' guarantees.

## Stack

- Go (module `github.com/rizkianakbar/whitzard/backend`), go-ethereum, PostgreSQL (pgx v5), coder/websocket
- HTTP routing, SIWE checks, sessions and migrations: standard library + go-ethereum only
- Don't add dependencies without asking

## Layout

```
cmd/whitzard/          entry point: `whitzard migrate | indexer | api | keeper | all`
internal/config        env / .env settings
internal/chain         event decoding + helpers; chain/bindings is GENERATED (scripts/gen-bindings.sh)
internal/store         PostgreSQL queries; migrations/ (embedded, applied in name order, never edited once committed)
internal/indexer       Registry + Escrow events → database, notifications
internal/api           REST, Sign-In with Ethereum, WebSocket
internal/keeper        finalize() scheduler
internal/evidence      evidence documents on disk, named by SHA-256
internal/testutil      throwaway test database + simulated chain with the real contracts
```

## Rules

- **The backend never holds member keys or moves member funds.** Members sign every
  state-changing transaction in their own wallet. The only key here is the keeper's, and the
  keeper only calls `finalize()`, which anyone may call and which can only pay the requester.
- The chain is the source of truth; the database is a mirror. Never write chain state from API
  input — only the indexer writes it, from events.
- Contract events and function signatures are the cross-repo interface. After a contract change:
  `(cd ../blockchain && pnpm hardhat build) && ./scripts/gen-bindings.sh`, then fix the indexer.
- Indexer: one DB transaction per block range, cursor included; stay `CONFIRMATIONS` behind the
  head; stop (don't guess) if the rebuilt snapshot size disagrees with `Escrow.getRequest`.
- Evidence documents are health data (UU 27/2022): only the requester and the request's snapshot
  members may download them; never log their contents.
- Addresses and hashes are stored lowercase 0x-hex; token amounts as `numeric(78,0)` / decimal strings.
- Keeper: decide "due" by chain time (latest block), confirm with `Escrow.canFinalize` before
  sending, skip requests that collected nothing, never resend within `RetryAfter`.
- Secrets (RPC URL, keeper key) only in `.env`, never committed.

## Working

```shell
docker compose up -d                      # PostgreSQL on 127.0.0.1:5433
go test ./...                             # needs the database above
./scripts/e2e.sh                          # full stack against a local Hardhat node
gofmt -l . && go vet ./...
go run ./cmd/whitzard migrate
```

Every behaviour gets a test. Indexer/keeper tests use `testutil.NewChain` (go-ethereum simulated
chain with the real compiled contracts) and `testutil.NewStore` (fresh database per test).

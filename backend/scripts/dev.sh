#!/usr/bin/env bash
# Local development stack: Hardhat node → deploy → `whitzard all` (indexer + API + keeper), and
# writes the contract addresses into ../frontend/.env.development.local (overrides .env.local under
# `next dev`; removed on exit, so the frontend falls back to its Sepolia config). Runs until Ctrl-C.
# Then, in another terminal:  cd frontend && pnpm dev   → http://localhost:3000
set -euo pipefail
set -m

BACKEND=$(cd "$(dirname "$0")/.." && pwd)
BLOCKCHAIN=$BACKEND/../blockchain
FRONTEND=$BACKEND/../frontend
DATA=$BACKEND/data/dev
DEPLOYMENT=dev
PIDS=()

cleanup() {
  for pid in "${PIDS[@]}"; do kill -TERM -- "-$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
  rm -rf "$BLOCKCHAIN/ignition/deployments/$DEPLOYMENT" "$FRONTEND/.env.development.local"
}
trap cleanup EXIT

wait_for() { for _ in $(seq 1 120); do curl -s -o /dev/null "$1" && return 0; sleep 0.5; done; echo "timed out: $2" >&2; return 1; }

if curl -s -o /dev/null http://127.0.0.1:8545; then echo "port 8545 is busy; stop the running node first" >&2; exit 1; fi
mkdir -p "$DATA"

echo "== PostgreSQL (fresh 'whitzard_dev' database)"
(cd "$BACKEND" && docker compose up -d --wait >/dev/null)
docker compose -f "$BACKEND/docker-compose.yml" exec -T postgres psql -U whitzard -d whitzard -q \
  -c "DROP DATABASE IF EXISTS whitzard_dev WITH (FORCE)" -c "CREATE DATABASE whitzard_dev"

echo "== Hardhat node"
(cd "$BLOCKCHAIN" && pnpm hardhat node >"$DATA/node.log" 2>&1) & PIDS+=($!)
wait_for http://127.0.0.1:8545 "the Hardhat node"

echo "== deploy"
rm -rf "$BLOCKCHAIN/ignition/deployments/$DEPLOYMENT"
(cd "$BLOCKCHAIN" && pnpm hardhat ignition deploy ignition/modules/Escrow.ts --network localhost --deployment-id $DEPLOYMENT >"$DATA/deploy.log" 2>&1) \
  || { cat "$DATA/deploy.log"; exit 1; }
ADDRS=$BLOCKCHAIN/ignition/deployments/$DEPLOYMENT/deployed_addresses.json
addr() { node -e 'console.log(require(process.argv[1])[process.argv[2]])' "$ADDRS" "$1"; }
TOKEN=$(addr "WhitzardTokenModule#WhitzardToken"); REGISTRY=$(addr "RegistryModule#Registry"); ESCROW=$(addr "EscrowModule#Escrow")

cat >"$FRONTEND/.env.development.local" <<ENV
# Written by backend/scripts/dev.sh for the local stack.
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_TOKEN_ADDRESS=$TOKEN
NEXT_PUBLIC_REGISTRY_ADDRESS=$REGISTRY
NEXT_PUBLIC_ESCROW_ADDRESS=$ESCROW
NEXT_PUBLIC_DEV_ACCOUNTS=true
ENV
echo "wrote frontend/.env.development.local (token $TOKEN, registry $REGISTRY, escrow $ESCROW)"

echo "== backend on http://127.0.0.1:8080 (logs: backend/data/dev/backend.log)"
(cd "$BACKEND" && env \
  DATABASE_URL="postgres://whitzard:whitzard@127.0.0.1:5433/whitzard_dev?sslmode=disable" \
  RPC_URL=http://127.0.0.1:8545 CHAIN_ID=31337 START_BLOCK=0 CONFIRMATIONS=0 POLL_INTERVAL=500ms \
  TOKEN_ADDRESS=$TOKEN REGISTRY_ADDRESS=$REGISTRY ESCROW_ADDRESS=$ESCROW \
  HTTP_ADDR=127.0.0.1:8080 CORS_ORIGINS=http://localhost:3000 SIWE_DOMAIN=localhost:3000 SIWE_URI=http://localhost:3000 \
  EVIDENCE_DIR="$DATA/evidence" KEEPER_POLL_INTERVAL=3s \
  KEEPER_PRIVATE_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 \
  go run ./cmd/whitzard all >"$DATA/backend.log" 2>&1) & PIDS+=($!)
wait_for http://127.0.0.1:8080/health "the backend" || { tail -20 "$DATA/backend.log"; exit 1; }

echo
echo "Ready. Start the frontend:  cd frontend && pnpm dev   →  http://localhost:3000"
echo "Time travel (e.g. past a deadline):  curl -s -X POST -H 'Content-Type: application/json' \\"
echo "  --data '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"evm_increaseTime\",\"params\":[3600]}' http://127.0.0.1:8545"
echo "Ctrl-C stops everything."
wait

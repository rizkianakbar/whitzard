#!/usr/bin/env bash
# End-to-end run on this machine: Hardhat node → deploy → `whitzard all` (indexer + API + keeper)
# → scripted user flow (../blockchain/scripts/e2e-flow.ts). Needs Docker (PostgreSQL), Go, pnpm.
#
#   ./scripts/e2e.sh
set -euo pipefail
set -m # background jobs get their own process group, so cleanup can stop their children too

BACKEND=$(cd "$(dirname "$0")/.." && pwd)
BLOCKCHAIN=$BACKEND/../blockchain
WORK=$(mktemp -d)
NODE_PORT=8545
API_ADDR=127.0.0.1:18080
DEPLOYMENT=e2e
PIDS=()

cleanup() {
  for pid in "${PIDS[@]}"; do kill -TERM -- "-$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
  rm -rf "$BLOCKCHAIN/ignition/deployments/$DEPLOYMENT" "$WORK"
}
trap cleanup EXIT

wait_for() { # url, what
  for _ in $(seq 1 120); do curl -s -o /dev/null "$1" && return 0; sleep 0.5; done
  echo "timed out waiting for $2" >&2; return 1
}

echo "== PostgreSQL"
(cd "$BACKEND" && docker compose up -d --wait >/dev/null)
docker compose -f "$BACKEND/docker-compose.yml" exec -T postgres psql -U whitzard -d whitzard -q \
  -c "DROP DATABASE IF EXISTS whitzard_e2e WITH (FORCE)" -c "CREATE DATABASE whitzard_e2e"

echo "== Hardhat node"
if curl -s -o /dev/null "http://127.0.0.1:$NODE_PORT"; then
  echo "port $NODE_PORT is busy; stop the running node first" >&2; exit 1
fi
(cd "$BLOCKCHAIN" && pnpm hardhat node --port $NODE_PORT >"$WORK/node.log" 2>&1) & PIDS+=($!)
wait_for "http://127.0.0.1:$NODE_PORT" "the Hardhat node"

echo "== deploy (Ignition, deployment id '$DEPLOYMENT')"
(cd "$BLOCKCHAIN" && pnpm hardhat ignition deploy ignition/modules/Escrow.ts --network localhost \
  --deployment-id $DEPLOYMENT >"$WORK/deploy.log" 2>&1) || { cat "$WORK/deploy.log"; exit 1; }
ADDRS=$BLOCKCHAIN/ignition/deployments/$DEPLOYMENT/deployed_addresses.json
addr() { node -e 'console.log(require(process.argv[1])[process.argv[2]])' "$ADDRS" "$1"; }
export TOKEN_ADDRESS=$(addr "WhitzardTokenModule#WhitzardToken")
export REGISTRY_ADDRESS=$(addr "RegistryModule#Registry")
export ESCROW_ADDRESS=$(addr "EscrowModule#Escrow")
echo "token $TOKEN_ADDRESS  registry $REGISTRY_ADDRESS  escrow $ESCROW_ADDRESS"

echo "== backend (whitzard all)"
# Hardhat's well-known account #9 is the keeper: an ordinary wallet that only pays gas.
(cd "$BACKEND" && env \
  DATABASE_URL="postgres://whitzard:whitzard@127.0.0.1:5433/whitzard_e2e?sslmode=disable" \
  RPC_URL="http://127.0.0.1:$NODE_PORT" CHAIN_ID=31337 START_BLOCK=0 CONFIRMATIONS=0 \
  POLL_INTERVAL=300ms KEEPER_POLL_INTERVAL=1s HTTP_ADDR=$API_ADDR EVIDENCE_DIR="$WORK/evidence" \
  KEEPER_PRIVATE_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 \
  go run ./cmd/whitzard all >"$WORK/backend.log" 2>&1) & PIDS+=($!)
wait_for "http://$API_ADDR/health" "the backend" || { cat "$WORK/backend.log"; exit 1; }

echo "== user flow"
(cd "$BLOCKCHAIN" && API_URL="http://$API_ADDR" pnpm hardhat run scripts/e2e-flow.ts --network localhost) || {
  echo "---- backend log"; tail -40 "$WORK/backend.log"; exit 1;
}
echo "---- backend log (last lines)"; tail -8 "$WORK/backend.log"

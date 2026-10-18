#!/usr/bin/env bash
# Regenerates the Go contract bindings from the Hardhat build output.
# Run after any contract change:  (cd ../blockchain && pnpm hardhat build) && ./scripts/gen-bindings.sh
set -euo pipefail

cd "$(dirname "$0")/.."
ARTIFACTS=../blockchain/artifacts/contracts
OUT=internal/chain/bindings
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

gen() {
  local artifact=$1 type=$2 file=$3
  node -e '
    const a = require(process.argv[1]);
    require("fs").writeFileSync(process.argv[2] + ".abi", JSON.stringify(a.abi));
    require("fs").writeFileSync(process.argv[2] + ".bin", a.bytecode);
  ' "$(pwd)/$ARTIFACTS/$artifact" "$TMP/$type"
  go run github.com/ethereum/go-ethereum/cmd/abigen@"$(go list -m -f "{{.Version}}" github.com/ethereum/go-ethereum)" \
    --abi "$TMP/$type.abi" --bin "$TMP/$type.bin" \
    --pkg bindings --type "$type" --out "$OUT/$file"
}

gen WhitzardToken.sol/WhitzardToken.json WhitzardToken token.go
gen Registry.sol/Registry.json Registry registry.go
gen Escrow.sol/Escrow.json Escrow escrow.go
echo "bindings written to $OUT"

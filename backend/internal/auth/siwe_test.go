package auth_test

import (
	"crypto/ecdsa"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/rizkianakbar/whitzard/backend/internal/auth"
)

// Sign signs like a wallet's personal_sign (v = 27/28).
func Sign(t *testing.T, key []byte, message string) string {
	t.Helper()
	priv, err := crypto.ToECDSA(key)
	if err != nil {
		t.Fatal(err)
	}
	sig, err := crypto.Sign(accounts.TextHash([]byte(message)), priv)
	if err != nil {
		t.Fatal(err)
	}
	sig[64] += 27
	return hexutil.Encode(sig)
}

func TestMessageFormat(t *testing.T) {
	addr := crypto.PubkeyToAddress(mustKey(t).PublicKey)
	at := time.Date(2026, 10, 19, 1, 2, 3, 0, time.UTC)
	msg := auth.Params{Domain: "localhost:3000", URI: "http://localhost:3000", ChainID: 11155111}.
		Message(addr, "abc123def456", at, at.Add(10*time.Minute))
	want := "localhost:3000 wants you to sign in with your Ethereum account:\n" + addr.Hex() + "\n\n" + auth.Statement +
		"\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 11155111\nNonce: abc123def456\nIssued At: 2026-10-19T01:02:03Z\nExpiration Time: 2026-10-19T01:12:03Z"
	if msg != want {
		t.Fatalf("message:\n%s\nwant:\n%s", msg, want)
	}
	if addr.Hex() == strings.ToLower(addr.Hex()) {
		t.Fatal("EIP-4361 requires the EIP-55 checksummed address")
	}
}

func TestVerify(t *testing.T) {
	key := mustKey(t)
	addr := crypto.PubkeyToAddress(key.PublicKey)
	other := crypto.PubkeyToAddress(mustKey(t).PublicKey)
	msg := "hello"
	sig := Sign(t, crypto.FromECDSA(key), msg)

	if err := auth.Verify(addr, msg, sig); err != nil {
		t.Fatalf("valid signature: %v", err)
	}
	if err := auth.Verify(other, msg, sig); !errors.Is(err, auth.ErrBadSignature) {
		t.Fatalf("other address: %v", err)
	}
	if err := auth.Verify(addr, "hello!", sig); !errors.Is(err, auth.ErrBadSignature) {
		t.Fatalf("changed message: %v", err)
	}
	if err := auth.Verify(addr, msg, "0x1234"); err == nil {
		t.Fatal("short signature must fail")
	}

	// v = 0/1 (some wallets) works too.
	raw, _ := hexutil.Decode(sig)
	raw[64] -= 27
	if err := auth.Verify(addr, msg, hexutil.Encode(raw)); err != nil {
		t.Fatalf("v=0/1 signature: %v", err)
	}
}

func TestSessionTokens(t *testing.T) {
	token, hash := auth.NewSessionToken()
	if auth.HashToken(token) != hash || token == hash {
		t.Fatal("hash must be derived from, and differ from, the token")
	}
	if other, _ := auth.NewSessionToken(); other == token {
		t.Fatal("tokens must be random")
	}
}

func mustKey(t *testing.T) *ecdsa.PrivateKey {
	t.Helper()
	k, err := crypto.GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	return k
}

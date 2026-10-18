// Package auth implements Sign-In with Ethereum (EIP-4361) and session tokens.
//
// The server builds the exact message (with a one-time nonce), stores it, and later only checks
// that the signature over that stored text recovers the claimed address. Because the server
// never parses a client-supplied message, there is no parsing to get wrong.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
)

// ErrBadSignature means the signature does not recover the claimed address.
var ErrBadSignature = errors.New("signature does not match the address")

// Params are the fixed parts of the sign-in message.
type Params struct {
	Domain  string // host the frontend runs on, e.g. "localhost:3000"
	URI     string // e.g. "http://localhost:3000"
	ChainID int64
}

// Statement is shown to the user by their wallet.
const Statement = "Sign in to Whitzard. This only proves you own this address: it costs nothing and does not send a transaction."

// Message builds the EIP-4361 message for `address` and `nonce`.
func (p Params) Message(address common.Address, nonce string, issuedAt, expiresAt time.Time) string {
	return fmt.Sprintf("%s wants you to sign in with your Ethereum account:\n%s\n\n%s\n\nURI: %s\nVersion: 1\nChain ID: %d\nNonce: %s\nIssued At: %s\nExpiration Time: %s",
		p.Domain, address.Hex(), Statement, p.URI, p.ChainID, nonce,
		issuedAt.UTC().Format(time.RFC3339), expiresAt.UTC().Format(time.RFC3339))
}

// NewNonce returns a random alphanumeric nonce (EIP-4361 requires at least 8 characters).
func NewNonce() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// Recover returns the address that produced `signature` (a 65-byte personal_sign signature, hex)
// over `message`.
func Recover(message, signature string) (common.Address, error) {
	sig, err := hexutil.Decode(strings.TrimSpace(signature))
	if err != nil {
		return common.Address{}, fmt.Errorf("signature: %w", err)
	}
	if len(sig) != 65 {
		return common.Address{}, fmt.Errorf("signature must be 65 bytes, got %d", len(sig))
	}
	sig = append([]byte(nil), sig...)
	if sig[64] >= 27 {
		sig[64] -= 27
	}
	if sig[64] > 1 {
		return common.Address{}, errors.New("signature recovery id must be 0, 1, 27 or 28")
	}
	pub, err := crypto.SigToPub(accounts.TextHash([]byte(message)), sig)
	if err != nil {
		return common.Address{}, fmt.Errorf("recover: %w", err)
	}
	return crypto.PubkeyToAddress(*pub), nil
}

// Verify checks that `signature` over `message` was made by `address`.
func Verify(address common.Address, message, signature string) error {
	signer, err := Recover(message, signature)
	if err != nil {
		return err
	}
	if signer != address {
		return ErrBadSignature
	}
	return nil
}

// NewSessionToken returns a random bearer token and the hash to store (never store the token).
func NewSessionToken() (token, hash string) {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	token = base64.RawURLEncoding.EncodeToString(b)
	return token, HashToken(token)
}

// HashToken is how a presented token is looked up.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

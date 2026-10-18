// Package chain holds the generated contract bindings (package bindings) and helpers for reading
// the Whitzard contracts.
package chain

import (
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/rizkianakbar/whitzard/backend/internal/chain/bindings"
)

// Decoder turns raw Registry / Escrow logs into the typed events of the bindings.
type Decoder struct {
	registryAddr common.Address
	escrowAddr   common.Address
	registry     *bindings.RegistryFilterer
	escrow       *bindings.EscrowFilterer
	registryABI  *abi.ABI
	escrowABI    *abi.ABI
}

// NewDecoder builds a decoder for the deployed Registry and Escrow.
func NewDecoder(registryAddr, escrowAddr common.Address) (*Decoder, error) {
	registry, err := bindings.NewRegistryFilterer(registryAddr, nil)
	if err != nil {
		return nil, err
	}
	escrow, err := bindings.NewEscrowFilterer(escrowAddr, nil)
	if err != nil {
		return nil, err
	}
	registryABI, err := bindings.RegistryMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	escrowABI, err := bindings.EscrowMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return &Decoder{registryAddr, escrowAddr, registry, escrow, registryABI, escrowABI}, nil
}

// Addresses returns the contracts whose logs the decoder understands.
func (d *Decoder) Addresses() []common.Address {
	return []common.Address{d.registryAddr, d.escrowAddr}
}

// Decode returns the typed event of `log` (e.g. *bindings.EscrowContributed), or nil for logs the
// indexer does not use.
func (d *Decoder) Decode(log types.Log) (any, error) {
	if len(log.Topics) == 0 {
		return nil, nil
	}
	topic := log.Topics[0]
	switch log.Address {
	case d.registryAddr:
		switch topic {
		case d.registryABI.Events["Registered"].ID:
			return d.registry.ParseRegistered(log)
		case d.registryABI.Events["ReadyChanged"].ID:
			return d.registry.ParseReadyChanged(log)
		}
	case d.escrowAddr:
		switch topic {
		case d.escrowABI.Events["RequestOpened"].ID:
			return d.escrow.ParseRequestOpened(log)
		case d.escrowABI.Events["Contributed"].ID:
			return d.escrow.ParseContributed(log)
		case d.escrowABI.Events["RequestCancelled"].ID:
			return d.escrow.ParseRequestCancelled(log)
		case d.escrowABI.Events["Refunded"].ID:
			return d.escrow.ParseRefunded(log)
		case d.escrowABI.Events["RequestFinalized"].ID:
			return d.escrow.ParseRequestFinalized(log)
		}
	}
	return nil, nil
}

// Addr renders an address the way the database stores it: lowercase 0x-hex.
func Addr(a common.Address) string { return strings.ToLower(a.Hex()) }

// Hash renders a 32-byte hash as lowercase 0x-hex.
func Hash(h [32]byte) string { return strings.ToLower(common.Hash(h).Hex()) }

// FormatUnits renders a token amount with 18 decimals, trimming trailing zeros ("12.5").
func FormatUnits(amount *big.Int) string {
	if amount == nil {
		return "0"
	}
	unit := new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)
	whole, frac := new(big.Int).QuoRem(amount, unit, new(big.Int))
	if frac.Sign() == 0 {
		return whole.String()
	}
	fs := strings.TrimRight(fmt.Sprintf("%018s", frac.String()), "0")
	return whole.String() + "." + fs
}

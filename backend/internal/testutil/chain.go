package testutil

import (
	"context"
	"crypto/ecdsa"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient/simulated"

	"github.com/rizkianakbar/whitzard/backend/internal/chain/bindings"
)

// Account is a funded test account.
type Account struct {
	Key  *ecdsa.PrivateKey
	Addr common.Address
	Opts *bind.TransactOpts
}

// Chain is a simulated chain with WhitzardToken, Registry and Escrow deployed and wired.
type Chain struct {
	t        *testing.T
	Backend  *simulated.Backend
	Client   simulated.Client
	Deployer *Account
	Accounts []*Account

	TokenAddr, RegistryAddr, EscrowAddr common.Address
	Token                               *bindings.WhitzardToken
	Registry                            *bindings.Registry
	Escrow                              *bindings.Escrow
	DeployBlock                         uint64
}

// NewChain starts a simulated chain with `accounts` funded accounts (plus a deployer) and
// deploys the contracts. useReadyFilter selects the Escrow snapshot mode.
func NewChain(t *testing.T, accounts int, useReadyFilter bool) *Chain {
	t.Helper()
	alloc := types.GenesisAlloc{}
	newAccount := func() *Account {
		key, err := crypto.GenerateKey()
		if err != nil {
			t.Fatal(err)
		}
		opts, err := bind.NewKeyedTransactorWithChainID(key, big.NewInt(1337))
		if err != nil {
			t.Fatal(err)
		}
		a := &Account{Key: key, Addr: crypto.PubkeyToAddress(key.PublicKey), Opts: opts}
		alloc[a.Addr] = types.Account{Balance: new(big.Int).Mul(big.NewInt(1000), big.NewInt(1e18))}
		return a
	}
	c := &Chain{t: t, Deployer: newAccount()}
	for range accounts {
		c.Accounts = append(c.Accounts, newAccount())
	}
	c.Backend = simulated.NewBackend(alloc)
	t.Cleanup(func() { _ = c.Backend.Close() })
	c.Client = c.Backend.Client()

	var err error
	head, err := c.Client.BlockNumber(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	c.DeployBlock = head + 1

	var tx *types.Transaction
	c.TokenAddr, tx, c.Token, err = bindings.DeployWhitzardToken(c.Deployer.Opts, c.Client)
	c.mine(tx, err)
	c.RegistryAddr, tx, c.Registry, err = bindings.DeployRegistry(c.Deployer.Opts, c.Client, c.TokenAddr)
	c.mine(tx, err)
	c.EscrowAddr, tx, c.Escrow, err = bindings.DeployEscrow(c.Deployer.Opts, c.Client, c.TokenAddr, c.RegistryAddr, useReadyFilter)
	c.mine(tx, err)
	c.Send(c.Registry.SetEscrow(c.Deployer.Opts, c.EscrowAddr))
	return c
}

// Send mines a transaction in its own block and fails the test if it reverted.
func (c *Chain) Send(tx *types.Transaction, err error) *types.Receipt {
	c.t.Helper()
	return c.mine(tx, err)
}

func (c *Chain) mine(tx *types.Transaction, err error) *types.Receipt {
	c.t.Helper()
	if err != nil {
		c.t.Fatalf("send: %v", err)
	}
	c.Backend.Commit()
	receipt, err := bind.WaitMined(context.Background(), c.Client, tx)
	if err != nil {
		c.t.Fatalf("wait mined: %v", err)
	}
	if receipt.Status != types.ReceiptStatusSuccessful {
		c.t.Fatalf("transaction %s reverted", tx.Hash().Hex())
	}
	return receipt
}

// Join gives `a` faucet tokens, registers it, optionally turns Ready on, and approves the Escrow.
func (c *Chain) Join(a *Account, ready bool) {
	c.t.Helper()
	c.Send(c.Token.Faucet(a.Opts))
	c.Send(c.Registry.Register(a.Opts))
	if ready {
		c.Send(c.Registry.SetReady(a.Opts, true))
	}
	c.Send(c.Token.Approve(a.Opts, c.EscrowAddr, new(big.Int).Lsh(big.NewInt(1), 255)))
}

// Mine adds n empty blocks.
func (c *Chain) Mine(n int) {
	for range n {
		c.Backend.Commit()
	}
}

// Warp moves the chain clock forward by d and mines a block.
func (c *Chain) Warp(d time.Duration) {
	c.t.Helper()
	if err := c.Backend.AdjustTime(d); err != nil {
		c.t.Fatal(err)
	}
}

// Ether returns n whole tokens (18 decimals).
func Ether(n int64) *big.Int { return new(big.Int).Mul(big.NewInt(n), big.NewInt(1e18)) }

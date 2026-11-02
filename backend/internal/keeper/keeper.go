// Package keeper sends Escrow.finalize for requests whose deadline has passed (keeper
// scheduler). It uses its own wallet, which only pays gas: finalize can be called by
// anyone and can only send the pool to the requester, so this key has no power over member funds.
package keeper

import (
	"context"
	"crypto/ecdsa"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/rizkianakbar/whitzard/backend/internal/chain"
	"github.com/rizkianakbar/whitzard/backend/internal/chain/bindings"
	"github.com/rizkianakbar/whitzard/backend/internal/store"
)

// Client is the part of an Ethereum client the keeper uses.
type Client interface {
	bind.ContractBackend
	HeaderByNumber(ctx context.Context, number *big.Int) (*types.Header, error)
}

// Config configures the keeper.
type Config struct {
	Escrow       common.Address
	Key          *ecdsa.PrivateKey
	ChainID      *big.Int
	PollInterval time.Duration // between passes
	RetryAfter   time.Duration // resend if the request is still due this long after sending
	BatchSize    int           // requests per pass
}

// Keeper finalizes due requests.
type Keeper struct {
	cfg    Config
	client Client
	store  *store.Store
	escrow *bindings.Escrow
	opts   *bind.TransactOpts
	log    *slog.Logger
	now    func() time.Time
}

// New builds a keeper.
func New(cfg Config, client Client, st *store.Store, log *slog.Logger) (*Keeper, error) {
	if cfg.Key == nil {
		return nil, errors.New("keeper needs a private key (KEEPER_PRIVATE_KEY)")
	}
	if cfg.PollInterval == 0 {
		cfg.PollInterval = 15 * time.Second
	}
	if cfg.RetryAfter == 0 {
		cfg.RetryAfter = 5 * time.Minute
	}
	if cfg.BatchSize == 0 {
		cfg.BatchSize = 20
	}
	escrow, err := bindings.NewEscrow(cfg.Escrow, client)
	if err != nil {
		return nil, err
	}
	opts, err := bind.NewKeyedTransactorWithChainID(cfg.Key, cfg.ChainID)
	if err != nil {
		return nil, err
	}
	return &Keeper{cfg: cfg, client: client, store: st, escrow: escrow, opts: opts, log: log, now: time.Now}, nil
}

// Address is the keeper's wallet (it needs ETH for gas).
func (k *Keeper) Address() common.Address { return k.opts.From }

// Run finalizes due requests until ctx ends.
func (k *Keeper) Run(ctx context.Context) error {
	for {
		if _, err := k.RunOnce(ctx); err != nil && !errors.Is(err, context.Canceled) {
			k.log.Error("keeper pass failed; retrying", "err", err)
		}
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(k.cfg.PollInterval):
		}
	}
}

// RunOnce sends finalize for every due request and returns the transactions sent.
func (k *Keeper) RunOnce(ctx context.Context) ([]*types.Transaction, error) {
	head, err := k.client.HeaderByNumber(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("latest block: %w", err)
	}
	chainNow := time.Unix(int64(head.Time), 0).UTC()
	due, err := k.store.DueRequests(ctx, chainNow, k.now().Add(-k.cfg.RetryAfter), k.cfg.BatchSize)
	if err != nil {
		return nil, err
	}

	var sent []*types.Transaction
	for _, id := range due {
		// The contract is the authority; the mirror may lag (e.g. already finalized by someone else).
		ok, err := k.escrow.CanFinalize(&bind.CallOpts{Context: ctx}, big.NewInt(id))
		if err != nil {
			return sent, fmt.Errorf("canFinalize(%d): %w", id, err)
		}
		if !ok {
			continue
		}
		opts := *k.opts
		opts.Context = ctx
		tx, err := k.escrow.Finalize(&opts, big.NewInt(id))
		if err != nil {
			return sent, fmt.Errorf("finalize(%d): %w", id, err)
		}
		if err := k.store.RecordFinalization(ctx, id, chain.Hash(tx.Hash()), k.now()); err != nil {
			return sent, err
		}
		k.log.Info("finalize sent", "request", id, "tx", tx.Hash().Hex())
		sent = append(sent, tx)
	}
	return sent, nil
}

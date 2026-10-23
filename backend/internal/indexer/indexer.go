// Package indexer mirrors the Registry and Escrow events into PostgreSQL and creates the
// notifications they trigger (thesis §3.3.1: event indexer).
//
// It reads logs in block ranges up to `head - Confirmations` (a simple guard against chain
// reorganisations), applies each range in one database transaction together with the new cursor,
// and therefore never skips or double-applies an event across restarts.
package indexer

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/rizkianakbar/whitzard/backend/internal/chain"
	"github.com/rizkianakbar/whitzard/backend/internal/chain/bindings"
	"github.com/rizkianakbar/whitzard/backend/internal/store"
)

// Client is the part of an Ethereum RPC client the indexer uses (ethclient.Client and the
// go-ethereum simulated backend both satisfy it).
type Client interface {
	bind.ContractCaller
	BlockNumber(ctx context.Context) (uint64, error)
	FilterLogs(ctx context.Context, q ethereum.FilterQuery) ([]types.Log, error)
	HeaderByNumber(ctx context.Context, number *big.Int) (*types.Header, error)
}

// Config configures one indexer.
type Config struct {
	Name          string         // cursor name, e.g. "sepolia"
	Registry      common.Address // Registry address
	Escrow        common.Address // Escrow address
	StartBlock    uint64         // first block to read; must be at or before the Registry deployment
	Confirmations uint64         // blocks to stay behind the head
	BatchSize     uint64         // blocks per eth_getLogs call
	PollInterval  time.Duration  // wait between passes when caught up
}

// Indexer mirrors chain events into the store.
type Indexer struct {
	cfg            Config
	client         Client
	store          *store.Store
	decoder        *chain.Decoder
	escrow         *bindings.EscrowCaller
	useReadyFilter bool
	log            *slog.Logger
}

// New builds an indexer and reads the Escrow's snapshot mode (Ready filter on or off).
func New(ctx context.Context, cfg Config, client Client, st *store.Store, log *slog.Logger) (*Indexer, error) {
	if cfg.Name == "" {
		cfg.Name = "default"
	}
	if cfg.BatchSize == 0 {
		cfg.BatchSize = 500
	}
	if cfg.PollInterval == 0 {
		cfg.PollInterval = 4 * time.Second
	}
	decoder, err := chain.NewDecoder(cfg.Registry, cfg.Escrow)
	if err != nil {
		return nil, err
	}
	escrow, err := bindings.NewEscrowCaller(cfg.Escrow, client)
	if err != nil {
		return nil, err
	}
	useReadyFilter, err := escrow.UseReadyFilter(&bind.CallOpts{Context: ctx})
	if err != nil {
		return nil, fmt.Errorf("read Escrow.useReadyFilter at %s: %w", cfg.Escrow.Hex(), err)
	}
	return &Indexer{cfg, client, st, decoder, escrow, useReadyFilter, log}, nil
}

// Run indexes until ctx is cancelled, waiting PollInterval whenever it has caught up.
func (ix *Indexer) Run(ctx context.Context) error {
	for {
		if _, err := ix.SyncOnce(ctx); err != nil {
			if errors.Is(err, context.Canceled) {
				return nil
			}
			ix.log.Error("indexer pass failed; retrying", "err", err)
		}
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(ix.cfg.PollInterval):
		}
	}
}

// SyncOnce processes every available block range and returns the last processed block.
func (ix *Indexer) SyncOnce(ctx context.Context) (uint64, error) {
	cursor, ok, err := ix.store.Cursor(ctx, ix.cfg.Name)
	if err != nil {
		return 0, err
	}
	from := ix.cfg.StartBlock
	if ok {
		from = cursor + 1
	}
	head, err := ix.client.BlockNumber(ctx)
	if err != nil {
		return 0, fmt.Errorf("head: %w", err)
	}
	if head < ix.cfg.Confirmations {
		return cursor, nil
	}
	safe := head - ix.cfg.Confirmations
	for from <= safe {
		to := min(from+ix.cfg.BatchSize-1, safe)
		if err := ix.processRange(ctx, from, to); errors.Is(err, store.ErrRangeTaken) {
			// Another indexer is ahead; the next pass starts from its cursor.
			return cursor, nil
		} else if err != nil {
			return cursor, fmt.Errorf("blocks %d-%d: %w", from, to, err)
		}
		cursor, from = to, to+1
	}
	return cursor, nil
}

func (ix *Indexer) processRange(ctx context.Context, from, to uint64) error {
	logs, err := ix.client.FilterLogs(ctx, ethereum.FilterQuery{
		FromBlock: new(big.Int).SetUint64(from),
		ToBlock:   new(big.Int).SetUint64(to),
		Addresses: ix.decoder.Addresses(),
	})
	if err != nil {
		return fmt.Errorf("get logs: %w", err)
	}
	blockTimes := map[uint64]time.Time{}
	return ix.store.InIndexTx(ctx, func(tx *store.IndexTx) error {
		if err := tx.ClaimRange(ctx, ix.cfg.Name, from); err != nil {
			return err
		}
		for _, l := range logs {
			if l.Removed {
				continue
			}
			event, err := ix.decoder.Decode(l)
			if err != nil {
				return fmt.Errorf("decode log %s#%d: %w", l.TxHash.Hex(), l.Index, err)
			}
			if event == nil {
				continue
			}
			t, ok := blockTimes[l.BlockNumber]
			if !ok {
				header, err := ix.client.HeaderByNumber(ctx, new(big.Int).SetUint64(l.BlockNumber))
				if err != nil {
					return fmt.Errorf("header %d: %w", l.BlockNumber, err)
				}
				t = time.Unix(int64(header.Time), 0).UTC()
				blockTimes[l.BlockNumber] = t
			}
			ref := store.LogRef{TxHash: chain.Hash(l.TxHash), Block: l.BlockNumber, LogIndex: l.Index, Time: t}
			if err := ix.apply(ctx, tx, event, ref); err != nil {
				return fmt.Errorf("apply %T at %s#%d: %w", event, l.TxHash.Hex(), l.Index, err)
			}
		}
		return tx.SetCursor(ctx, ix.cfg.Name, to)
	})
}

func (ix *Indexer) apply(ctx context.Context, tx *store.IndexTx, event any, ref store.LogRef) error {
	switch e := event.(type) {
	case *bindings.RegistryRegistered:
		return tx.RegisterMember(ctx, chain.Addr(e.Member), ref)

	case *bindings.RegistryReadyChanged:
		return tx.SetReady(ctx, chain.Addr(e.Member), e.Ready, ref)

	case *bindings.EscrowRequestOpened:
		return ix.applyOpened(ctx, tx, e, ref)

	case *bindings.EscrowContributed:
		id, member := e.Id.Uint64(), chain.Addr(e.Member)
		requester, err := tx.Contribute(ctx, id, member, e.Amount.String(), ref)
		if err != nil {
			return err
		}
		return tx.Notify(ctx, requester, "contribution_received", "Iuran baru masuk",
			fmt.Sprintf("Seorang anggota membantu %s WHZD untuk permintaanmu nomor %d.", chain.FormatUnits(e.Amount), id), id, e.Amount.String())

	case *bindings.EscrowRequestCancelled:
		id := e.Id.Uint64()
		contributors, err := tx.Cancel(ctx, id, ref)
		if err != nil {
			return err
		}
		for _, m := range contributors {
			if err := tx.Notify(ctx, m, "request_cancelled", "Permintaan dibatalkan",
				fmt.Sprintf("Permintaan nomor %d dibatalkan oleh peminta. Kamu bisa mengambil iuranmu kembali.", id), id, ""); err != nil {
				return err
			}
		}
		return nil

	case *bindings.EscrowRefunded:
		return tx.Refund(ctx, e.Id.Uint64(), chain.Addr(e.Member), e.Amount.String(), ref)

	case *bindings.EscrowRequestFinalized:
		id, total := e.Id.Uint64(), chain.FormatUnits(e.Total)
		expired := e.Total.Sign() == 0
		requester, contributors, err := tx.Finalize(ctx, id, e.Total.String(), expired, ref)
		if err != nil {
			return err
		}
		if expired {
			return tx.Notify(ctx, requester, "request_expired", "Permintaan berakhir",
				fmt.Sprintf("Waktu permintaan nomor %d habis tanpa iuran.", id), id, "")
		}
		if err := tx.Notify(ctx, requester, "request_finalized", "Dana sudah diterima",
			fmt.Sprintf("%s WHZD dari permintaan nomor %d sudah masuk ke dompetmu.", total, id), id, e.Total.String()); err != nil {
			return err
		}
		for _, m := range contributors {
			if err := tx.Notify(ctx, m, "request_forwarded", "Dana sudah diteruskan",
				fmt.Sprintf("Permintaan nomor %d yang kamu bantu sudah selesai: %s WHZD sampai ke peminta.", id, total), id, e.Total.String()); err != nil {
				return err
			}
		}
		return nil
	}
	return nil
}

// applyOpened stores the request, rebuilds its snapshot from the indexed Registry history,
// cross-checks the size against the contract, and notifies every snapshot member (KF-4).
func (ix *Indexer) applyOpened(ctx context.Context, tx *store.IndexTx, e *bindings.EscrowRequestOpened, ref store.LogRef) error {
	id := e.Id.Uint64()
	requester := chain.Addr(e.Requester)
	snapshotBlock := e.SnapshotBlock.Uint64()

	members, err := tx.SnapshotMembers(ctx, snapshotBlock, requester, ix.useReadyFilter)
	if err != nil {
		return err
	}
	onChain, err := ix.escrow.GetRequest(&bind.CallOpts{Context: ctx}, e.Id)
	if err != nil {
		return fmt.Errorf("Escrow.getRequest(%d): %w", id, err)
	}
	if onChain.SnapshotSize.Cmp(big.NewInt(int64(len(members)))) != 0 {
		// The indexed Registry history is incomplete (e.g. StartBlock is after the Registry was
		// deployed). Notifying the wrong members would be worse than stopping.
		return fmt.Errorf("snapshot of request %d: rebuilt %d members, contract says %s; the indexed Registry history is incomplete (is StartBlock at or before the Registry deployment?) or the snapshot rule differs from the contract",
			id, len(members), onChain.SnapshotSize)
	}

	if _, err := tx.OpenRequest(ctx, store.OpenedRequest{
		ID:            id,
		Requester:     requester,
		Amount:        e.Amount.String(),
		Share:         e.Share.String(),
		SnapshotBlock: snapshotBlock,
		Deadline:      time.Unix(int64(e.Deadline), 0).UTC(),
		EvidenceHash:  chain.Hash(e.EvidenceHash),
	}, len(members), ref); err != nil {
		return err
	}
	if err := tx.AddSnapshotMembers(ctx, id, members); err != nil {
		return err
	}
	for _, m := range members {
		if err := tx.Notify(ctx, m, "request_opened", "Ada yang butuh bantuan",
			fmt.Sprintf("Permintaan nomor %d meminta %s WHZD dari setiap anggota.", id, chain.FormatUnits(e.Share)), id, e.Share.String()); err != nil {
			return err
		}
	}
	return nil
}

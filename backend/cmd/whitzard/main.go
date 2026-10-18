// Command whitzard runs the Whitzard backend.
//
//	whitzard migrate   apply database migrations
//	whitzard indexer   mirror contract events into PostgreSQL
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/rizkianakbar/whitzard/backend/internal/config"
	"github.com/rizkianakbar/whitzard/backend/internal/indexer"
	"github.com/rizkianakbar/whitzard/backend/internal/store"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stderr, nil))
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: whitzard migrate | indexer")
		os.Exit(2)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := run(ctx, os.Args[1], log); err != nil {
		log.Error("exit", "err", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, command string, log *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	st, err := store.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer st.Close()
	if err := st.Migrate(ctx); err != nil {
		return err
	}

	switch command {
	case "migrate":
		log.Info("migrations applied")
		return nil
	case "indexer":
		if err := cfg.RequireChain(); err != nil {
			return err
		}
		client, err := ethclient.DialContext(ctx, cfg.RPCURL)
		if err != nil {
			return fmt.Errorf("dial RPC: %w", err)
		}
		defer client.Close()
		ix, err := indexer.New(ctx, indexer.Config{
			Name:          cfg.IndexerName,
			Registry:      cfg.RegistryAddress,
			Escrow:        cfg.EscrowAddress,
			StartBlock:    cfg.StartBlock,
			Confirmations: cfg.Confirmations,
			BatchSize:     cfg.BatchSize,
			PollInterval:  cfg.PollInterval,
		}, client, st, log)
		if err != nil {
			return err
		}
		log.Info("indexer started", "escrow", cfg.EscrowAddress.Hex(), "from", cfg.StartBlock, "confirmations", cfg.Confirmations)
		return ix.Run(ctx)
	default:
		return fmt.Errorf("unknown command %q", command)
	}
}

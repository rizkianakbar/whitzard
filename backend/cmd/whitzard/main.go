// Command whitzard runs the Whitzard backend.
//
//	whitzard migrate   apply database migrations
//	whitzard indexer   mirror contract events into PostgreSQL
//	whitzard api       serve the REST + WebSocket API
//	whitzard all       indexer and api in one process
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/rizkianakbar/whitzard/backend/internal/api"
	"github.com/rizkianakbar/whitzard/backend/internal/auth"
	"github.com/rizkianakbar/whitzard/backend/internal/config"
	"github.com/rizkianakbar/whitzard/backend/internal/evidence"
	"github.com/rizkianakbar/whitzard/backend/internal/indexer"
	"github.com/rizkianakbar/whitzard/backend/internal/store"
)

const usage = "usage: whitzard migrate | indexer | api | all"

func main() {
	log := slog.New(slog.NewTextHandler(os.Stderr, nil))
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, usage)
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
	if command == "migrate" {
		log.Info("migrations applied")
		return nil
	}

	if err := cfg.RequireChain(); err != nil {
		return err
	}
	client, err := ethclient.DialContext(ctx, cfg.RPCURL)
	if err != nil {
		return fmt.Errorf("dial RPC: %w", err)
	}
	defer client.Close()
	chainID, err := client.ChainID(ctx)
	if err != nil {
		return fmt.Errorf("read chain id: %w", err)
	}
	if chainID.Int64() != cfg.ChainID {
		return fmt.Errorf("RPC is on chain %s but CHAIN_ID is %d", chainID, cfg.ChainID)
	}

	var tasks []func(context.Context) error
	switch command {
	case "indexer":
		tasks = append(tasks, indexerTask(cfg, client, st, log))
	case "api":
		tasks = append(tasks, apiTasks(cfg, client, st, log)...)
	case "all":
		tasks = append(tasks, indexerTask(cfg, client, st, log))
		tasks = append(tasks, apiTasks(cfg, client, st, log)...)
	default:
		return fmt.Errorf("unknown command %q; %s", command, usage)
	}
	return runAll(ctx, tasks)
}

func indexerTask(cfg *config.Config, client *ethclient.Client, st *store.Store, log *slog.Logger) func(context.Context) error {
	return func(ctx context.Context) error {
		ix, err := indexer.New(ctx, indexer.Config{
			Name:          cfg.IndexerName,
			Registry:      cfg.RegistryAddress,
			Escrow:        cfg.EscrowAddress,
			StartBlock:    cfg.StartBlock,
			Confirmations: cfg.Confirmations,
			BatchSize:     cfg.BatchSize,
			PollInterval:  cfg.PollInterval,
		}, client, st, log.With("component", "indexer"))
		if err != nil {
			return err
		}
		log.Info("indexer started", "escrow", cfg.EscrowAddress.Hex(), "from", cfg.StartBlock, "confirmations", cfg.Confirmations)
		return ix.Run(ctx)
	}
}

func apiTasks(cfg *config.Config, client *ethclient.Client, st *store.Store, log *slog.Logger) []func(context.Context) error {
	hub := api.NewHub(st, log.With("component", "hub"))
	serve := func(ctx context.Context) error {
		ev, err := evidence.NewDisk(cfg.EvidenceDir, cfg.MaxUploadBytes)
		if err != nil {
			return err
		}
		contracts, err := api.NewContracts(client, cfg.TokenAddress, cfg.RegistryAddress, cfg.EscrowAddress)
		if err != nil {
			return err
		}
		srv := api.New(api.Config{
			SIWE:           auth.Params{Domain: cfg.SIWEDomain, URI: cfg.SIWEURI, ChainID: cfg.ChainID},
			SessionTTL:     cfg.SessionTTL,
			MaxUploadBytes: cfg.MaxUploadBytes,
			CORSOrigins:    cfg.CORSOrigins,
		}, st, ev, contracts, hub, log.With("component", "api"))

		httpServer := &http.Server{Addr: cfg.HTTPAddr, Handler: srv.Handler(), ReadHeaderTimeout: 10 * time.Second}
		go func() {
			<-ctx.Done()
			shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			_ = httpServer.Shutdown(shutdown)
		}()
		log.Info("api listening", "addr", cfg.HTTPAddr)
		if err := httpServer.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	}
	listen := func(ctx context.Context) error { return hub.Run(ctx, cfg.DatabaseURL) }
	return []func(context.Context) error{serve, listen}
}

// runAll runs tasks until ctx ends or one fails; a failure stops the others.
func runAll(ctx context.Context, tasks []func(context.Context) error) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	errs := make(chan error, len(tasks))
	for _, task := range tasks {
		go func() { errs <- task(ctx) }()
	}
	var first error
	for range tasks {
		if err := <-errs; err != nil && first == nil {
			first = err
			cancel()
		}
	}
	return first
}

// Package config reads the backend settings from the environment (and a .env file, if present).
package config

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

// Config holds every setting; which ones are required depends on the command.
type Config struct {
	DatabaseURL string

	RPCURL          string
	TokenAddress    common.Address
	RegistryAddress common.Address
	EscrowAddress   common.Address

	IndexerName   string
	StartBlock    uint64
	Confirmations uint64
	BatchSize     uint64
	PollInterval  time.Duration
}

// Load reads `.env` (without overriding variables already set) and then the environment.
func Load() (*Config, error) {
	if err := loadDotEnv(".env"); err != nil {
		return nil, err
	}
	c := &Config{
		DatabaseURL: get("DATABASE_URL", "postgres://whitzard:whitzard@127.0.0.1:5433/whitzard?sslmode=disable"),
		RPCURL:      os.Getenv("RPC_URL"),
		IndexerName: get("INDEXER_NAME", "default"),
	}
	var errs []error
	c.TokenAddress = address("TOKEN_ADDRESS", &errs)
	c.RegistryAddress = address("REGISTRY_ADDRESS", &errs)
	c.EscrowAddress = address("ESCROW_ADDRESS", &errs)
	c.StartBlock = uintVar("START_BLOCK", 0, &errs)
	c.Confirmations = uintVar("CONFIRMATIONS", 2, &errs)
	c.BatchSize = uintVar("BATCH_SIZE", 500, &errs)
	if d, err := time.ParseDuration(get("POLL_INTERVAL", "4s")); err != nil {
		errs = append(errs, fmt.Errorf("POLL_INTERVAL: %w", err))
	} else {
		c.PollInterval = d
	}
	return c, errors.Join(errs...)
}

// RequireChain checks the settings needed to talk to the contracts.
func (c *Config) RequireChain() error {
	var errs []error
	if c.RPCURL == "" {
		errs = append(errs, errors.New("RPC_URL is required"))
	}
	for _, v := range []struct {
		name string
		addr common.Address
	}{
		{"TOKEN_ADDRESS", c.TokenAddress}, {"REGISTRY_ADDRESS", c.RegistryAddress}, {"ESCROW_ADDRESS", c.EscrowAddress},
	} {
		if v.addr == (common.Address{}) {
			errs = append(errs, fmt.Errorf("%s is required", v.name))
		}
	}
	return errors.Join(errs...)
}

func get(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func address(key string, errs *[]error) common.Address {
	v := os.Getenv(key)
	if v == "" {
		return common.Address{}
	}
	if !common.IsHexAddress(v) {
		*errs = append(*errs, fmt.Errorf("%s: %q is not an address", key, v))
		return common.Address{}
	}
	return common.HexToAddress(v)
}

func uintVar(key string, fallback uint64, errs *[]error) uint64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseUint(v, 10, 64)
	if err != nil {
		*errs = append(*errs, fmt.Errorf("%s: %w", key, err))
		return fallback
	}
	return n
}

// loadDotEnv sets KEY=VALUE lines from `path` that are not already in the environment.
func loadDotEnv(path string) error {
	f, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key, value = strings.TrimSpace(key), strings.Trim(strings.TrimSpace(value), `"'`)
		if _, set := os.LookupEnv(key); !set {
			_ = os.Setenv(key, value)
		}
	}
	return scanner.Err()
}

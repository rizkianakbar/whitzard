// Package testutil provides test fixtures: a throwaway PostgreSQL database per test and a
// simulated chain with the Whitzard contracts deployed.
package testutil

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/url"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/rizkianakbar/whitzard/backend/internal/store"
)

// DefaultTestDatabaseURL matches docker-compose.yml.
const DefaultTestDatabaseURL = "postgres://whitzard:whitzard@127.0.0.1:5433/whitzard?sslmode=disable"

// NewStore creates a fresh, migrated database for one test and drops it afterwards.
// Start PostgreSQL first with `docker compose up -d`; TEST_DATABASE_URL overrides the default.
func NewStore(t *testing.T) *store.Store {
	t.Helper()
	ctx := context.Background()
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		base = DefaultTestDatabaseURL
	}

	admin, err := pgx.Connect(ctx, base)
	if err != nil {
		t.Fatalf("connect to test PostgreSQL (run `docker compose up -d` in backend/): %v", err)
	}
	defer admin.Close(ctx)

	suffix := make([]byte, 6)
	_, _ = rand.Read(suffix)
	name := "whitzard_test_" + hex.EncodeToString(suffix)
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+name); err != nil {
		t.Fatalf("create test database: %v", err)
	}

	u, err := url.Parse(base)
	if err != nil {
		t.Fatal(err)
	}
	u.Path = "/" + name
	st, err := store.Open(ctx, u.String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		st.Close()
		conn, err := pgx.Connect(context.Background(), base)
		if err == nil {
			_, _ = conn.Exec(context.Background(), "DROP DATABASE IF EXISTS "+name+" WITH (FORCE)")
			conn.Close(context.Background())
		}
	})
	if err := st.Migrate(ctx); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return st
}

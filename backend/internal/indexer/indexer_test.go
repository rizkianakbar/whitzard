package indexer_test

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/crypto"

	"github.com/rizkianakbar/whitzard/backend/internal/chain"
	"github.com/rizkianakbar/whitzard/backend/internal/indexer"
	"github.com/rizkianakbar/whitzard/backend/internal/store"
	"github.com/rizkianakbar/whitzard/backend/internal/testutil"
)

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

func newIndexer(t *testing.T, c *testutil.Chain, st *store.Store, cfg indexer.Config) *indexer.Indexer {
	t.Helper()
	cfg.Registry, cfg.Escrow = c.RegistryAddr, c.EscrowAddr
	if cfg.StartBlock == 0 {
		cfg.StartBlock = c.DeployBlock
	}
	ix, err := indexer.New(context.Background(), cfg, c.Client, st, quiet)
	if err != nil {
		t.Fatal(err)
	}
	return ix
}

func scalar[T any](t *testing.T, st *store.Store, sql string, args ...any) T {
	t.Helper()
	var v T
	if err := st.Pool.QueryRow(context.Background(), sql, args...).Scan(&v); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
	return v
}

// scenario: alice's request is funded by bob and carol and finalized; bob's request (alice and
// dave contribute) is cancelled and dave claims his refund. eve is registered but never Ready;
// frank was Ready but turned it off before any request, so he is in no snapshot either.
func scenario(t *testing.T, c *testutil.Chain, st *store.Store) (alice, bob, carol, dave, eve *testutil.Account) {
	t.Helper()
	alice, bob, carol, dave, eve = c.Accounts[0], c.Accounts[1], c.Accounts[2], c.Accounts[3], c.Accounts[4]
	for _, a := range []*testutil.Account{alice, bob, carol, dave} {
		c.Join(a, true)
	}
	c.Join(eve, false)
	frank := c.Accounts[5]
	c.Join(frank, true)
	c.Send(c.Registry.SetReady(frank.Opts, false))
	c.Mine(1)

	evidence := crypto.Keccak256Hash([]byte("hospital-bill.pdf"))
	if _, err := st.Pool.Exec(context.Background(), `
		INSERT INTO request_drafts (requester, title, description, evidence_hash, file_name, content_type, size_bytes)
		VALUES ($1, 'Surgery', 'Appendix surgery bill', $2, 'bill.pdf', 'application/pdf', 1234)`,
		chain.Addr(alice.Addr), chain.Hash(evidence)); err != nil {
		t.Fatal(err)
	}

	c.Send(c.Escrow.OpenRequest(alice.Opts, testutil.Ether(90), uint64(24*time.Hour/time.Second), evidence, testutil.Ether(0)))
	c.Send(c.Escrow.Contribute(bob.Opts, testutil.Ether(0).SetInt64(1)))
	c.Send(c.Escrow.Contribute(carol.Opts, testutil.Ether(0).SetInt64(1)))

	c.Send(c.Escrow.OpenRequest(bob.Opts, testutil.Ether(90), uint64(24*time.Hour/time.Second), [32]byte{2}, testutil.Ether(0)))
	c.Send(c.Escrow.Contribute(alice.Opts, testutil.Ether(0).SetInt64(2)))
	c.Send(c.Escrow.Contribute(dave.Opts, testutil.Ether(0).SetInt64(2)))
	c.Send(c.Escrow.CancelRequest(bob.Opts, testutil.Ether(0).SetInt64(2)))
	c.Send(c.Escrow.ClaimRefund(dave.Opts, testutil.Ether(0).SetInt64(2)))

	c.Warp(24 * time.Hour)
	c.Send(c.Escrow.Finalize(eve.Opts, testutil.Ether(0).SetInt64(1)))
	return
}

func TestIndexerMirrorsScenario(t *testing.T) {
	c := testutil.NewChain(t, 6, true)
	st := testutil.NewStore(t)
	alice, bob, carol, dave, eve := scenario(t, c, st)
	ix := newIndexer(t, c, st, indexer.Config{Name: "test", BatchSize: 3})

	head, err := c.Client.BlockNumber(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	cursor, err := ix.SyncOnce(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if cursor != head {
		t.Fatalf("cursor %d, head %d", cursor, head)
	}

	// Members and Ready status.
	if n := scalar[int](t, st, `SELECT count(*) FROM members`); n != 6 {
		t.Fatalf("members = %d, want 6", n)
	}
	if scalar[bool](t, st, `SELECT ready FROM members WHERE address = $1`, chain.Addr(eve.Addr)) {
		t.Fatal("eve should not be Ready")
	}

	// Request 1: finalized, draft linked, snapshot of the 3 other Ready members.
	r1 := struct{ status, collected, total, title string }{}
	if err := st.Pool.QueryRow(context.Background(), `
		SELECT status, collected::text, finalized_total::text, title FROM requests WHERE id = 1`).
		Scan(&r1.status, &r1.collected, &r1.total, &r1.title); err != nil {
		t.Fatal(err)
	}
	if r1.status != "finalized" || r1.collected != testutil.Ether(60).String() || r1.total != r1.collected || r1.title != "Surgery" {
		t.Fatalf("request 1 = %+v", r1)
	}
	if n := scalar[int](t, st, `SELECT count(*) FROM snapshot_members WHERE request_id = 1`); n != 3 {
		t.Fatalf("request 1 snapshot = %d, want 3", n)
	}
	if got := scalar[string](t, st, `SELECT response FROM snapshot_members WHERE request_id = 1 AND member = $1`, chain.Addr(bob.Addr)); got != "contributed" {
		t.Fatalf("bob's response = %q", got)
	}
	if got := scalar[string](t, st, `SELECT response FROM snapshot_members WHERE request_id = 1 AND member = $1`, chain.Addr(dave.Addr)); got != "pending" {
		t.Fatalf("dave's response = %q", got)
	}
	if n := scalar[int](t, st, `SELECT count(*) FROM snapshot_members WHERE member = $1`, chain.Addr(eve.Addr)); n != 0 {
		t.Fatal("eve (not Ready) must not be in any snapshot")
	}
	if n := scalar[int](t, st, `SELECT count(*) FROM snapshot_members WHERE member = $1`, chain.Addr(c.Accounts[5].Addr)); n != 0 {
		t.Fatal("frank (Ready turned off) must not be in any snapshot")
	}

	// Request 2: cancelled; dave's refund recorded, alice's still pending.
	if got := scalar[string](t, st, `SELECT status FROM requests WHERE id = 2`); got != "cancelled" {
		t.Fatalf("request 2 status = %q", got)
	}
	if !scalar[bool](t, st, `SELECT refunded FROM contributions WHERE request_id = 2 AND member = $1`, chain.Addr(dave.Addr)) {
		t.Fatal("dave's refund not recorded")
	}
	if scalar[bool](t, st, `SELECT refunded FROM contributions WHERE request_id = 2 AND member = $1`, chain.Addr(alice.Addr)) {
		t.Fatal("alice has not claimed yet")
	}
	if got := scalar[string](t, st, `SELECT refunded_total::text FROM requests WHERE id = 2`); got != testutil.Ether(30).String() {
		t.Fatalf("refunded_total = %s", got)
	}

	// Notifications: who got what.
	count := func(member *testutil.Account, kind string) int {
		return scalar[int](t, st, `SELECT count(*) FROM notifications WHERE member = $1 AND type = $2`, chain.Addr(member.Addr), kind)
	}
	checks := []struct {
		who  *testutil.Account
		kind string
		want int
	}{
		{bob, "request_opened", 1}, {carol, "request_opened", 2}, {dave, "request_opened", 2}, {alice, "request_opened", 1},
		{eve, "request_opened", 0},
		{alice, "contribution_received", 2}, {bob, "contribution_received", 2},
		{alice, "request_cancelled", 1}, {dave, "request_cancelled", 1},
		{alice, "request_finalized", 1}, {bob, "request_forwarded", 1}, {carol, "request_forwarded", 1},
	}
	for _, ck := range checks {
		if got := count(ck.who, ck.kind); got != ck.want {
			t.Errorf("%s %s notifications = %d, want %d", ck.who.Addr.Hex()[:8], ck.kind, got, ck.want)
		}
	}
}

func TestIndexerIsIdempotentAcrossRestarts(t *testing.T) {
	c := testutil.NewChain(t, 6, true)
	st := testutil.NewStore(t)
	scenario(t, c, st)

	first := newIndexer(t, c, st, indexer.Config{Name: "test", BatchSize: 4})
	if _, err := first.SyncOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	notifications := scalar[int](t, st, `SELECT count(*) FROM notifications`)

	// A second pass and a fresh instance (a restart) find nothing new.
	if _, err := first.SyncOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	restarted := newIndexer(t, c, st, indexer.Config{Name: "test", BatchSize: 4})
	if _, err := restarted.SyncOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := scalar[int](t, st, `SELECT count(*) FROM notifications`); got != notifications {
		t.Fatalf("notifications %d after restart, want %d", got, notifications)
	}
	if got := scalar[string](t, st, `SELECT collected::text FROM requests WHERE id = 1`); got != testutil.Ether(60).String() {
		t.Fatalf("collected = %s after restart", got)
	}
}

func TestConcurrentIndexersApplyEachRangeOnce(t *testing.T) {
	c := testutil.NewChain(t, 6, true)
	st := testutil.NewStore(t)
	scenario(t, c, st)

	// Two processes on one database (e.g. two machines running `all`) race over the same blocks.
	errs := make(chan error, 2)
	for range 2 {
		ix := newIndexer(t, c, st, indexer.Config{Name: "test", BatchSize: 2})
		go func() {
			_, err := ix.SyncOnce(context.Background())
			errs <- err
		}()
	}
	for range 2 {
		if err := <-errs; err != nil {
			t.Fatal(err)
		}
	}

	// Same notifications as one indexer on a fresh database.
	alone := testutil.NewStore(t)
	if _, err := newIndexer(t, c, alone, indexer.Config{Name: "test"}).SyncOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	want := scalar[int](t, alone, `SELECT count(*) FROM notifications`)
	if got := scalar[int](t, st, `SELECT count(*) FROM notifications`); got != want {
		t.Fatalf("%d notifications, want %d", got, want)
	}
	if got := scalar[string](t, st, `SELECT collected::text FROM requests WHERE id = 1`); got != testutil.Ether(60).String() {
		t.Fatalf("collected = %s", got)
	}
}

func TestIndexerStaysBehindConfirmations(t *testing.T) {
	c := testutil.NewChain(t, 2, true)
	st := testutil.NewStore(t)
	c.Join(c.Accounts[0], true)

	head, _ := c.Client.BlockNumber(context.Background())
	ix := newIndexer(t, c, st, indexer.Config{Name: "test", Confirmations: 3})
	cursor, err := ix.SyncOnce(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if cursor != head-3 {
		t.Fatalf("cursor %d, want head-3 = %d", cursor, head-3)
	}
}

func TestIndexerRefusesIncompleteHistory(t *testing.T) {
	c := testutil.NewChain(t, 3, true)
	st := testutil.NewStore(t)
	c.Join(c.Accounts[1], true)
	c.Join(c.Accounts[2], true)
	c.Join(c.Accounts[0], false)
	c.Mine(1)
	start, _ := c.Client.BlockNumber(context.Background())
	c.Send(c.Escrow.OpenRequest(c.Accounts[0].Opts, testutil.Ether(90), 3600, [32]byte{1}, testutil.Ether(0)))

	// Starting after the Ready changes means the snapshot cannot be rebuilt.
	ix := newIndexer(t, c, st, indexer.Config{Name: "test", StartBlock: start})
	_, err := ix.SyncOnce(context.Background())
	if err == nil || !strings.Contains(err.Error(), "StartBlock") {
		t.Fatalf("want a snapshot mismatch error, got %v", err)
	}
	if n := scalar[int](t, st, `SELECT count(*) FROM requests`); n != 0 {
		t.Fatal("nothing from the failed range may be committed")
	}
}

func TestIndexerWithoutReadyFilter(t *testing.T) {
	c := testutil.NewChain(t, 3, false)
	st := testutil.NewStore(t)
	requester, ready, notReady := c.Accounts[0], c.Accounts[1], c.Accounts[2]
	c.Join(requester, false)
	c.Join(ready, true)
	c.Join(notReady, false)
	c.Mine(1)
	c.Send(c.Escrow.OpenRequest(requester.Opts, testutil.Ether(90), 3600, [32]byte{1}, testutil.Ether(0)))

	ix := newIndexer(t, c, st, indexer.Config{Name: "test"})
	if _, err := ix.SyncOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if n := scalar[int](t, st, `SELECT count(*) FROM snapshot_members WHERE request_id = 1`); n != 2 {
		t.Fatalf("snapshot = %d, want 2 (every registered member but the requester)", n)
	}
}

package keeper

import (
	"context"
	"io"
	"log/slog"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"

	"github.com/rizkianakbar/whitzard/backend/internal/indexer"
	"github.com/rizkianakbar/whitzard/backend/internal/store"
	"github.com/rizkianakbar/whitzard/backend/internal/testutil"
)

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

type env struct {
	t      *testing.T
	c      *testutil.Chain
	st     *store.Store
	ix     *indexer.Indexer
	keeper *Keeper
}

func newEnv(t *testing.T) *env {
	t.Helper()
	c := testutil.NewChain(t, 5, true)
	for _, a := range c.Accounts[:4] {
		c.Join(a, true)
	}
	c.Mine(1)
	st := testutil.NewStore(t)
	ix, err := indexer.New(context.Background(), indexer.Config{
		Name: "test", Registry: c.RegistryAddr, Escrow: c.EscrowAddr, StartBlock: c.DeployBlock,
	}, c.Client, st, quiet)
	if err != nil {
		t.Fatal(err)
	}
	// The keeper's wallet is an ordinary funded account with no special role.
	k, err := New(Config{Escrow: c.EscrowAddr, Key: c.Accounts[4].Key, ChainID: big.NewInt(1337), RetryAfter: 5 * time.Minute}, c.Client, st, quiet)
	if err != nil {
		t.Fatal(err)
	}
	return &env{t, c, st, ix, k}
}

func (e *env) sync() {
	e.t.Helper()
	if _, err := e.ix.SyncOnce(context.Background()); err != nil {
		e.t.Fatal(err)
	}
}

func (e *env) runOnce() int {
	e.t.Helper()
	sent, err := e.keeper.RunOnce(context.Background())
	if err != nil {
		e.t.Fatal(err)
	}
	return len(sent)
}

func (e *env) state(id int64) uint8 {
	e.t.Helper()
	s, err := e.c.Escrow.Status(&bind.CallOpts{}, big.NewInt(id))
	if err != nil {
		e.t.Fatal(err)
	}
	return s
}

func (e *env) open(a *testutil.Account, duration uint64, contributors ...*testutil.Account) int64 {
	e.t.Helper()
	e.c.Send(e.c.Escrow.OpenRequest(a.Opts, testutil.Ether(90), duration, [32]byte{byte(duration)}, big.NewInt(0)))
	n, err := e.c.Escrow.RequestCount(&bind.CallOpts{})
	if err != nil {
		e.t.Fatal(err)
	}
	for _, m := range contributors {
		e.c.Send(e.c.Escrow.Contribute(m.Opts, n))
	}
	return n.Int64()
}

const (
	statusFunding   = 1
	statusFinalized = 2
	statusExpired   = 3
)

func TestFinalizesOnlyDueFundedRequests(t *testing.T) {
	e := newEnv(t)
	alice, bob, carol, dave := e.c.Accounts[0], e.c.Accounts[1], e.c.Accounts[2], e.c.Accounts[3]
	funded := e.open(alice, 3600, bob)
	empty := e.open(bob, 3600)
	later := e.open(carol, 86400, dave)
	e.sync()

	if got := e.runOnce(); got != 0 {
		t.Fatalf("nothing is due yet, sent %d", got)
	}

	e.c.Warp(2 * time.Hour)
	e.c.Mine(1)
	if got := e.runOnce(); got != 1 {
		t.Fatalf("sent %d, want 1 (the funded request only)", got)
	}
	e.c.Mine(1)
	e.sync()

	if e.state(funded) != statusFinalized {
		t.Fatal("funded request not finalized")
	}
	if e.state(empty) != statusExpired {
		t.Fatal("the empty request expires without a transaction")
	}
	if e.state(later) != statusFunding {
		t.Fatal("the later request must not be touched")
	}
	var status string
	if err := e.st.Pool.QueryRow(context.Background(), `SELECT status FROM requests WHERE id = $1`, funded).Scan(&status); err != nil || status != "finalized" {
		t.Fatalf("mirror status %q, %v", status, err)
	}

	if got := e.runOnce(); got != 0 {
		t.Fatalf("second pass sent %d, want 0", got)
	}
}

func TestResendsAfterADroppedTransaction(t *testing.T) {
	e := newEnv(t)
	id := e.open(e.c.Accounts[0], 3600, e.c.Accounts[1])
	e.sync()
	e.c.Warp(2 * time.Hour)
	e.c.Mine(1)

	if got := e.runOnce(); got != 1 {
		t.Fatalf("sent %d, want 1", got)
	}
	e.c.Backend.Rollback() // the transaction is dropped before being mined

	if got := e.runOnce(); got != 0 {
		t.Fatalf("within the retry window: sent %d, want 0", got)
	}
	e.keeper.now = func() time.Time { return time.Now().Add(10 * time.Minute) }
	if got := e.runOnce(); got != 1 {
		t.Fatalf("after the retry window: sent %d, want 1", got)
	}
	e.c.Mine(1)
	if e.state(id) != statusFinalized {
		t.Fatal("not finalized after the resend")
	}
}

func TestSkipsWhenSomeoneElseFinalizedFirst(t *testing.T) {
	e := newEnv(t)
	id := e.open(e.c.Accounts[0], 3600, e.c.Accounts[1])
	e.sync()
	e.c.Warp(2 * time.Hour)
	e.c.Mine(1)

	// Anyone may finalize; the mirror has not seen it yet.
	e.c.Send(e.c.Escrow.Finalize(e.c.Accounts[2].Opts, big.NewInt(id)))
	if got := e.runOnce(); got != 0 {
		t.Fatalf("sent %d, want 0: canFinalize is false", got)
	}
}

func TestKeeperNeedsAKey(t *testing.T) {
	if _, err := New(Config{}, nil, nil, quiet); err == nil {
		t.Fatal("a keeper without a key must not start")
	}
}

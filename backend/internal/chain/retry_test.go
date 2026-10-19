package chain

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/rpc"
)

func TestTransient(t *testing.T) {
	for _, c := range []struct {
		err  error
		want bool
	}{
		{fmt.Errorf("read: %w", rpc.HTTPError{StatusCode: 429, Status: "429 Too Many Requests"}), true},
		{rpc.HTTPError{StatusCode: 503}, true},
		{rpc.HTTPError{StatusCode: 401}, false},
		{&net.OpError{Op: "dial", Err: errors.New("connection refused")}, true},
		{errors.New("execution reverted"), false},
	} {
		if got := Transient(c.err); got != c.want {
			t.Errorf("Transient(%v) = %v, want %v", c.err, got, c.want)
		}
	}
}

func TestRetry(t *testing.T) {
	quiet := slog.New(slog.NewTextHandler(io.Discard, nil))
	ctx := context.Background()

	calls := 0
	err := Retry(ctx, quiet, "test", func() error {
		if calls++; calls < 2 {
			return rpc.HTTPError{StatusCode: 429}
		}
		return nil
	})
	if err != nil || calls != 2 {
		t.Fatalf("rate-limited once: err %v after %d calls, want success after 2", err, calls)
	}

	calls = 0
	permanent := errors.New("execution reverted")
	if err := Retry(ctx, quiet, "test", func() error { calls++; return permanent }); !errors.Is(err, permanent) || calls != 1 {
		t.Fatalf("permanent error: err %v after %d calls, want it returned at once", err, calls)
	}

	cancelled, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
	defer cancel()
	if err := Retry(cancelled, quiet, "test", func() error { return rpc.HTTPError{StatusCode: 429} }); err == nil {
		t.Fatal("cancelled context: want the last error")
	}
}

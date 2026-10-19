package chain

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"time"

	"github.com/ethereum/go-ethereum/rpc"
)

// Transient reports whether an RPC error is worth retrying: the provider rate-limited us (429),
// failed on its side (5xx), or the network did. Anything else (a revert, a wrong address) is not.
func Transient(err error) bool {
	var httpErr rpc.HTTPError
	if errors.As(err, &httpErr) {
		return httpErr.StatusCode == 429 || httpErr.StatusCode >= 500
	}
	var netErr net.Error
	return errors.As(err, &netErr)
}

// Retry runs f until it succeeds, retrying transient RPC errors with backoff (1s doubling to
// 30s). Used for the reads at startup, so one rate-limited request doesn't stop the process.
func Retry(ctx context.Context, log *slog.Logger, what string, f func() error) error {
	wait := time.Second
	for {
		err := f()
		if err == nil || !Transient(err) {
			return err
		}
		log.Warn("RPC unavailable; retrying", "what", what, "in", wait, "err", err)
		select {
		case <-ctx.Done():
			return err
		case <-time.After(wait):
		}
		wait = min(wait*2, 30*time.Second)
	}
}

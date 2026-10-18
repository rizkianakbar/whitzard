package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// Cursor returns the last fully processed block of indexer `name`, and false if it never ran.
func (s *Store) Cursor(ctx context.Context, name string) (uint64, bool, error) {
	var block int64
	err := s.Pool.QueryRow(ctx, `SELECT block FROM indexer_cursor WHERE name = $1`, name).Scan(&block)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return uint64(block), true, nil
}

// IndexTx is one indexer batch: every write of a block range plus the new cursor, committed
// together, so a crash never leaves a range half-applied.
type IndexTx struct {
	tx pgx.Tx
}

// InIndexTx runs fn in a transaction and commits it if fn returns nil.
func (s *Store) InIndexTx(ctx context.Context, fn func(*IndexTx) error) error {
	return pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error { return fn(&IndexTx{tx: tx}) })
}

// SetCursor records that every block up to and including `block` has been processed.
func (t *IndexTx) SetCursor(ctx context.Context, name string, block uint64) error {
	_, err := t.tx.Exec(ctx, `
		INSERT INTO indexer_cursor (name, block) VALUES ($1, $2)
		ON CONFLICT (name) DO UPDATE SET block = EXCLUDED.block, updated_at = now()`,
		name, int64(block))
	return err
}

// LogRef identifies the log being applied.
type LogRef struct {
	TxHash   string
	Block    uint64
	LogIndex uint
	Time     time.Time
}

// RegisterMember mirrors Registered(member).
func (t *IndexTx) RegisterMember(ctx context.Context, member string, ref LogRef) error {
	_, err := t.tx.Exec(ctx, `
		INSERT INTO members (address, registered_at_block, registered_tx) VALUES ($1, $2, $3)
		ON CONFLICT (address) DO NOTHING`,
		member, int64(ref.Block), ref.TxHash)
	return err
}

// SetReady mirrors ReadyChanged(member, ready) and keeps its history for snapshot rebuilding.
func (t *IndexTx) SetReady(ctx context.Context, member string, ready bool, ref LogRef) error {
	if _, err := t.tx.Exec(ctx, `
		INSERT INTO ready_history (member, block_number, log_index, ready, tx_hash)
		VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
		member, int64(ref.Block), int(ref.LogIndex), ready, ref.TxHash); err != nil {
		return err
	}
	_, err := t.tx.Exec(ctx, `UPDATE members SET ready = $2, updated_at = now() WHERE address = $1`, member, ready)
	return err
}

// OpenedRequest is the data of a RequestOpened event.
type OpenedRequest struct {
	ID            uint64
	Requester     string
	Amount        string
	Share         string
	SnapshotBlock uint64
	Deadline      time.Time
	EvidenceHash  string
}

// OpenRequest mirrors RequestOpened, links the requester's draft with the same evidence hash
// (title, description, document) and returns the draft id, if any.
func (t *IndexTx) OpenRequest(ctx context.Context, r OpenedRequest, snapshotSize int, ref LogRef) (draftID *int64, err error) {
	err = t.tx.QueryRow(ctx, `
		SELECT id FROM request_drafts
		WHERE requester = $1 AND evidence_hash = $2 AND request_id IS NULL
		ORDER BY created_at DESC LIMIT 1`, r.Requester, r.EvidenceHash).Scan(&draftID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	if _, err := t.tx.Exec(ctx, `
		INSERT INTO requests (id, requester, amount, share, snapshot_block, snapshot_size, deadline,
		                      evidence_hash, status, draft_id, title, description,
		                      opened_tx, opened_block, opened_at)
		SELECT $1, $2, $3::numeric, $4::numeric, $5, $6, $7, $8, 'open', d.id, d.title, d.description, $9, $10, $11
		FROM (SELECT $12::bigint AS id) k LEFT JOIN request_drafts d ON d.id = k.id
		ON CONFLICT (id) DO NOTHING`,
		int64(r.ID), r.Requester, r.Amount, r.Share, int64(r.SnapshotBlock), snapshotSize, r.Deadline,
		r.EvidenceHash, ref.TxHash, int64(ref.Block), ref.Time, draftID); err != nil {
		return nil, err
	}
	if draftID != nil {
		if _, err := t.tx.Exec(ctx, `UPDATE request_drafts SET request_id = $2 WHERE id = $1`, *draftID, int64(r.ID)); err != nil {
			return nil, err
		}
	}
	return draftID, nil
}

// SnapshotMembers rebuilds who was in a request's snapshot: the members Ready (or, without the
// Ready filter, registered) at the end of `snapshotBlock`, excluding the requester. This is the
// same rule the contracts apply with their checkpoints.
func (t *IndexTx) SnapshotMembers(ctx context.Context, snapshotBlock uint64, requester string, useReadyFilter bool) ([]string, error) {
	var rows pgx.Rows
	var err error
	if useReadyFilter {
		rows, err = t.tx.Query(ctx, `
			SELECT member FROM (
				SELECT DISTINCT ON (member) member, ready FROM ready_history
				WHERE block_number <= $1
				ORDER BY member, block_number DESC, log_index DESC
			) latest
			WHERE ready AND member <> $2
			ORDER BY member`, int64(snapshotBlock), requester)
	} else {
		rows, err = t.tx.Query(ctx, `
			SELECT address FROM members
			WHERE registered_at_block <= $1 AND address <> $2
			ORDER BY address`, int64(snapshotBlock), requester)
	}
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[string])
}

// AddSnapshotMembers stores the snapshot with every member's response still pending.
func (t *IndexTx) AddSnapshotMembers(ctx context.Context, requestID uint64, members []string) error {
	_, err := t.tx.Exec(ctx, `
		INSERT INTO snapshot_members (request_id, member)
		SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING`, int64(requestID), members)
	return err
}

// Notify stores a notification for `member` and announces it on NotifyChannel; the announcement
// is delivered only when the transaction commits.
func (t *IndexTx) Notify(ctx context.Context, member, kind, title, description string, requestID uint64) error {
	var id int64
	if err := t.tx.QueryRow(ctx, `
		INSERT INTO notifications (member, type, title, description, request_id)
		VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		member, kind, title, description, int64(requestID)).Scan(&id); err != nil {
		return err
	}
	payload, err := json.Marshal(map[string]any{"id": id, "member": member})
	if err != nil {
		return err
	}
	_, err = t.tx.Exec(ctx, `SELECT pg_notify($1, $2)`, NotifyChannel, string(payload))
	return err
}

// Contribute mirrors Contributed(id, member, amount) and returns the requester.
func (t *IndexTx) Contribute(ctx context.Context, requestID uint64, member, amount string, ref LogRef) (requester string, err error) {
	tag, err := t.tx.Exec(ctx, `
		INSERT INTO contributions (request_id, member, amount, tx_hash, block_number, contributed_at)
		VALUES ($1, $2, $3::numeric, $4, $5, $6) ON CONFLICT DO NOTHING`,
		int64(requestID), member, amount, ref.TxHash, int64(ref.Block), ref.Time)
	if err != nil {
		return "", err
	}
	if tag.RowsAffected() == 1 {
		if err := t.tx.QueryRow(ctx, `
			UPDATE requests SET collected = collected + $2::numeric, contributors = contributors + 1,
			       status = CASE WHEN status = 'open' THEN 'funding' ELSE status END
			WHERE id = $1 RETURNING requester`, int64(requestID), amount).Scan(&requester); err != nil {
			return "", fmt.Errorf("update request %d: %w", requestID, err)
		}
	} else if err := t.tx.QueryRow(ctx, `SELECT requester FROM requests WHERE id = $1`, int64(requestID)).Scan(&requester); err != nil {
		return "", err
	}
	_, err = t.tx.Exec(ctx, `
		UPDATE snapshot_members SET response = 'contributed', responded_at = $3
		WHERE request_id = $1 AND member = $2`, int64(requestID), member, ref.Time)
	return requester, err
}

// Cancel mirrors RequestCancelled and returns the contributors to notify.
func (t *IndexTx) Cancel(ctx context.Context, requestID uint64, ref LogRef) ([]string, error) {
	if _, err := t.tx.Exec(ctx, `
		UPDATE requests SET status = 'cancelled', cancelled_tx = $2, cancelled_at = $3 WHERE id = $1`,
		int64(requestID), ref.TxHash, ref.Time); err != nil {
		return nil, err
	}
	return t.contributors(ctx, requestID)
}

// Refund mirrors Refunded(id, member, amount).
func (t *IndexTx) Refund(ctx context.Context, requestID uint64, member, amount string, ref LogRef) error {
	tag, err := t.tx.Exec(ctx, `
		UPDATE contributions SET refunded = true, refund_tx_hash = $3, refunded_at = $4
		WHERE request_id = $1 AND member = $2 AND NOT refunded`,
		int64(requestID), member, ref.TxHash, ref.Time)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return nil // already applied
	}
	_, err = t.tx.Exec(ctx, `UPDATE requests SET refunded_total = refunded_total + $2::numeric WHERE id = $1`,
		int64(requestID), amount)
	return err
}

// Finalize mirrors RequestFinalized (total 0 means the request expired) and returns the
// requester and the contributors to notify.
func (t *IndexTx) Finalize(ctx context.Context, requestID uint64, total string, expired bool, ref LogRef) (string, []string, error) {
	status := "finalized"
	if expired {
		status = "expired"
	}
	var requester string
	if err := t.tx.QueryRow(ctx, `
		UPDATE requests SET status = $2, finalized_tx = $3, finalized_at = $4, finalized_total = $5::numeric
		WHERE id = $1 RETURNING requester`,
		int64(requestID), status, ref.TxHash, ref.Time, total).Scan(&requester); err != nil {
		return "", nil, err
	}
	contributors, err := t.contributors(ctx, requestID)
	return requester, contributors, err
}

func (t *IndexTx) contributors(ctx context.Context, requestID uint64) ([]string, error) {
	rows, err := t.tx.Query(ctx, `SELECT member FROM contributions WHERE request_id = $1 ORDER BY member`, int64(requestID))
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[string])
}

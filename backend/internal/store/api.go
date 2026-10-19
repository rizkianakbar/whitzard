package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// ---------------------------------------------------------------- auth

// CreateNonce stores a one-time sign-in nonce with the exact message to be signed.
func (s *Store) CreateNonce(ctx context.Context, nonce, address, message string, expiresAt time.Time) error {
	_, err := s.Pool.Exec(ctx, `INSERT INTO auth_nonces (nonce, address, message, expires_at) VALUES ($1, $2, $3, $4)`,
		nonce, address, message, expiresAt)
	return err
}

// ConsumeNonce marks the nonce used and returns its message, atomically: an unknown, expired,
// already used or other-address nonce returns ErrNotFound.
func (s *Store) ConsumeNonce(ctx context.Context, nonce, address string) (string, error) {
	var message string
	err := s.Pool.QueryRow(ctx, `
		UPDATE auth_nonces SET used_at = now()
		WHERE nonce = $1 AND address = $2 AND used_at IS NULL AND expires_at > now()
		RETURNING message`, nonce, address).Scan(&message)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return message, err
}

// CreateSession stores a session by token hash.
func (s *Store) CreateSession(ctx context.Context, tokenHash, address string, expiresAt time.Time) error {
	_, err := s.Pool.Exec(ctx, `INSERT INTO sessions (token_hash, address, expires_at) VALUES ($1, $2, $3)`,
		tokenHash, address, expiresAt)
	return err
}

// SessionAddress returns the address of a live session, or ErrNotFound.
func (s *Store) SessionAddress(ctx context.Context, tokenHash string) (string, error) {
	var address string
	err := s.Pool.QueryRow(ctx, `SELECT address FROM sessions WHERE token_hash = $1 AND expires_at > now()`,
		tokenHash).Scan(&address)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return address, err
}

// DeleteSession ends a session.
func (s *Store) DeleteSession(ctx context.Context, tokenHash string) error {
	_, err := s.Pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}

// ---------------------------------------------------------------- members

// Member is the off-chain profile plus mirrored status. Everything in the profile is
// self-declared and never verified.
type Member struct {
	Address           string     `json:"address"`
	DisplayName       *string    `json:"displayName"`
	Nickname          *string    `json:"nickname"`
	BirthDate         *time.Time `json:"-"` // only for the member themself; see Profile.BirthDate
	City              *string    `json:"city"`
	Photo             *string    `json:"photo"` // SHA-256 of the photo, also a cache key; null if none
	PhotoType         *string    `json:"-"`
	Ready             bool       `json:"ready"`
	RegisteredAtBlock int64      `json:"registeredAtBlock"`
	Contributions     int        `json:"contributions"`
	Requests          int        `json:"requests"`
	CreatedAt         time.Time  `json:"createdAt"`
}

// GetMember returns a registered member, or ErrNotFound.
func (s *Store) GetMember(ctx context.Context, address string) (*Member, error) {
	var m Member
	err := s.Pool.QueryRow(ctx, `
		SELECT address, display_name, nickname, birth_date, city, photo_hash, photo_type,
		       ready, registered_at_block, created_at,
		       (SELECT count(*) FROM contributions c WHERE c.member = m.address AND NOT c.refunded),
		       (SELECT count(*) FROM requests r WHERE r.requester = m.address AND r.status <> 'cancelled')
		FROM members m WHERE address = $1`, address).
		Scan(&m.Address, &m.DisplayName, &m.Nickname, &m.BirthDate, &m.City, &m.Photo, &m.PhotoType,
			&m.Ready, &m.RegisteredAtBlock, &m.CreatedAt, &m.Contributions, &m.Requests)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &m, err
}

// Profile is the editable part of a member; nil fields are cleared.
type Profile struct {
	DisplayName *string
	Nickname    *string
	BirthDate   *time.Time
	City        *string
}

// SetProfile replaces a registered member's profile (not the photo); ErrNotFound if not registered.
func (s *Store) SetProfile(ctx context.Context, address string, p Profile) error {
	tag, err := s.Pool.Exec(ctx, `
		UPDATE members SET display_name = $2, nickname = $3, birth_date = $4, city = $5, updated_at = now()
		WHERE address = $1`, address, p.DisplayName, p.Nickname, p.BirthDate, p.City)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// SetPhoto sets (or, with a nil hash, removes) a registered member's photo; ErrNotFound if not registered.
func (s *Store) SetPhoto(ctx context.Context, address string, hash, contentType *string) error {
	tag, err := s.Pool.Exec(ctx, `UPDATE members SET photo_hash = $2, photo_type = $3, updated_at = now() WHERE address = $1`,
		address, hash, contentType)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Stats are community-wide totals, safe to show to anyone (no personal or health data).
type Stats struct {
	Members       int    `json:"members"`
	ReadyMembers  int    `json:"readyMembers"`
	Requests      int    `json:"requests"`
	Funded        int    `json:"funded"`      // finalized requests
	Distributed   string `json:"distributed"` // wei paid out to requesters
	Contributions int    `json:"contributions"`
}

// GetStats returns the community totals.
func (s *Store) GetStats(ctx context.Context) (*Stats, error) {
	var st Stats
	err := s.Pool.QueryRow(ctx, `
		SELECT (SELECT count(*) FROM members),
		       (SELECT count(*) FROM members WHERE ready),
		       (SELECT count(*) FROM requests),
		       (SELECT count(*) FROM requests WHERE status = 'finalized'),
		       (SELECT coalesce(sum(collected), 0)::text FROM requests WHERE status = 'finalized'),
		       (SELECT count(*) FROM contributions WHERE NOT refunded)`).
		Scan(&st.Members, &st.ReadyMembers, &st.Requests, &st.Funded, &st.Distributed, &st.Contributions)
	return &st, err
}

// ---------------------------------------------------------------- requests

// Draft is what a requester uploads before sending openRequest.
type Draft struct {
	Requester    string
	Title        string
	Description  string
	EvidenceHash string
	FileName     string
	ContentType  string
	Size         int64
}

// CreateDraft stores a draft and returns its id.
func (s *Store) CreateDraft(ctx context.Context, d Draft) (int64, error) {
	var id int64
	err := s.Pool.QueryRow(ctx, `
		INSERT INTO request_drafts (requester, title, description, evidence_hash, file_name, content_type, size_bytes)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		d.Requester, d.Title, d.Description, d.EvidenceHash, d.FileName, d.ContentType, d.Size).Scan(&id)
	return id, err
}

// Request is a mirrored request. Amounts are decimal strings in the token's smallest unit.
type Request struct {
	ID            int64      `json:"id"`
	Requester     string     `json:"requester"`
	Title         *string    `json:"title"`
	Description   *string    `json:"description"`
	Amount        string     `json:"amount"`
	Share         string     `json:"share"`
	Collected     string     `json:"collected"`
	RefundedTotal string     `json:"refundedTotal"`
	Contributors  int        `json:"contributors"`
	SnapshotBlock int64      `json:"snapshotBlock"`
	SnapshotSize  int        `json:"snapshotSize"`
	Deadline      time.Time  `json:"deadline"`
	EvidenceHash  string     `json:"evidenceHash"`
	HasEvidence   bool       `json:"hasEvidence"`
	StoredStatus  string     `json:"-"`
	OpenedAt      time.Time  `json:"openedAt"`
	OpenedTx      string     `json:"openedTx"`
	FinalizedAt   *time.Time `json:"finalizedAt"`
	FinalizedTx   *string    `json:"finalizedTx"`
	CancelledAt   *time.Time `json:"cancelledAt"`
	CancelledTx   *string    `json:"cancelledTx"`
}

const requestColumns = `
	r.id, r.requester, r.title, r.description, r.amount::text, r.share::text, r.collected::text,
	r.refunded_total::text, r.contributors, r.snapshot_block, r.snapshot_size, r.deadline,
	r.evidence_hash, r.draft_id IS NOT NULL, r.status, r.opened_at, r.opened_tx,
	r.finalized_at, r.finalized_tx, r.cancelled_at, r.cancelled_tx`

func scanRequest(row pgx.Row) (*Request, error) {
	var r Request
	err := row.Scan(&r.ID, &r.Requester, &r.Title, &r.Description, &r.Amount, &r.Share, &r.Collected,
		&r.RefundedTotal, &r.Contributors, &r.SnapshotBlock, &r.SnapshotSize, &r.Deadline,
		&r.EvidenceHash, &r.HasEvidence, &r.StoredStatus, &r.OpenedAt, &r.OpenedTx,
		&r.FinalizedAt, &r.FinalizedTx, &r.CancelledAt, &r.CancelledTx)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &r, err
}

// GetRequest returns one request, or ErrNotFound.
func (s *Store) GetRequest(ctx context.Context, id int64) (*Request, error) {
	return scanRequest(s.Pool.QueryRow(ctx, `SELECT `+requestColumns+` FROM requests r WHERE r.id = $1`, id))
}

// RequestFilter narrows ListRequests.
type RequestFilter struct {
	Requester string // optional
	Member    string // optional: requests whose snapshot includes this member
	BeforeID  int64  // optional: paging, newest first
	Limit     int
}

// ListRequests returns requests newest first.
func (s *Store) ListRequests(ctx context.Context, f RequestFilter) ([]*Request, error) {
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 50
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT `+requestColumns+` FROM requests r
		WHERE ($1 = '' OR r.requester = $1)
		  AND ($2 = '' OR EXISTS (SELECT 1 FROM snapshot_members s WHERE s.request_id = r.id AND s.member = $2))
		  AND ($3 = 0 OR r.id < $3)
		ORDER BY r.id DESC LIMIT $4`, f.Requester, f.Member, f.BeforeID, f.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*Request
	for rows.Next() {
		r, err := scanRequest(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// EvidenceFile returns the linked document's hash, name and type, or ErrNotFound.
func (s *Store) EvidenceFile(ctx context.Context, requestID int64) (hash, fileName, contentType string, err error) {
	err = s.Pool.QueryRow(ctx, `
		SELECT d.evidence_hash, d.file_name, d.content_type
		FROM requests r JOIN request_drafts d ON d.id = r.draft_id WHERE r.id = $1`, requestID).
		Scan(&hash, &fileName, &contentType)
	if errors.Is(err, pgx.ErrNoRows) {
		err = ErrNotFound
	}
	return
}

// SnapshotCounts returns how many snapshot members gave each response.
func (s *Store) SnapshotCounts(ctx context.Context, requestID int64) (map[string]int, error) {
	rows, err := s.Pool.Query(ctx, `SELECT response, count(*) FROM snapshot_members WHERE request_id = $1 GROUP BY response`, requestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	counts := map[string]int{"pending": 0, "participating": 0, "declined": 0, "contributed": 0}
	for rows.Next() {
		var response string
		var n int
		if err := rows.Scan(&response, &n); err != nil {
			return nil, err
		}
		counts[response] = n
	}
	return counts, rows.Err()
}

// SnapshotResponse returns `member`'s response for a request, or ErrNotFound if not in the snapshot.
func (s *Store) SnapshotResponse(ctx context.Context, requestID int64, member string) (string, error) {
	var response string
	err := s.Pool.QueryRow(ctx, `SELECT response FROM snapshot_members WHERE request_id = $1 AND member = $2`,
		requestID, member).Scan(&response)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return response, err
}

// ErrAlreadyContributed means the member's contribution is already on-chain; the response can no
// longer change.
var ErrAlreadyContributed = errors.New("already contributed")

// SetResponse records "participating" or "declined" for a snapshot member. ErrNotFound if not in
// the snapshot, ErrAlreadyContributed once the contribution is on-chain.
func (s *Store) SetResponse(ctx context.Context, requestID int64, member, response string) error {
	tag, err := s.Pool.Exec(ctx, `
		UPDATE snapshot_members SET response = $3, responded_at = now()
		WHERE request_id = $1 AND member = $2 AND response <> 'contributed'`, requestID, member, response)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 1 {
		return nil
	}
	if _, err := s.SnapshotResponse(ctx, requestID, member); err != nil {
		return err
	}
	return ErrAlreadyContributed
}

// Contribution is `member`'s contribution to a request, if any.
type Contribution struct {
	RequestID     int64      `json:"requestId"`
	Amount        string     `json:"amount"`
	TxHash        string     `json:"txHash"`
	ContributedAt time.Time  `json:"contributedAt"`
	Refunded      bool       `json:"refunded"`
	RefundTxHash  *string    `json:"refundTxHash"`
	RefundedAt    *time.Time `json:"refundedAt"`
}

// GetContribution returns `member`'s contribution to a request, or ErrNotFound.
func (s *Store) GetContribution(ctx context.Context, requestID int64, member string) (*Contribution, error) {
	var c Contribution
	err := s.Pool.QueryRow(ctx, `
		SELECT request_id, amount::text, tx_hash, contributed_at, refunded, refund_tx_hash, refunded_at
		FROM contributions WHERE request_id = $1 AND member = $2`, requestID, member).
		Scan(&c.RequestID, &c.Amount, &c.TxHash, &c.ContributedAt, &c.Refunded, &c.RefundTxHash, &c.RefundedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &c, err
}

// ProofCandidates returns, newest first, requests `member` contributed to that could prove the
// right to request: not refunded and not cancelled. The chain makes the final decision.
func (s *Store) ProofCandidates(ctx context.Context, member string, limit int) ([]int64, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT c.request_id FROM contributions c JOIN requests r ON r.id = c.request_id
		WHERE c.member = $1 AND NOT c.refunded AND r.status <> 'cancelled'
		ORDER BY c.block_number DESC LIMIT $2`, member, limit)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[int64])
}

// RefundCandidates returns the cancelled requests where `member` has not claimed back yet.
func (s *Store) RefundCandidates(ctx context.Context, member string) ([]int64, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT c.request_id FROM contributions c JOIN requests r ON r.id = c.request_id
		WHERE c.member = $1 AND NOT c.refunded AND r.status = 'cancelled'
		ORDER BY c.request_id`, member)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[int64])
}

// ---------------------------------------------------------------- notifications

// Notification is one message for a member.
type Notification struct {
	ID          int64     `json:"id"`
	Member      string    `json:"-"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	RequestID   *int64    `json:"requestId"`
	IsRead      bool      `json:"isRead"`
	CreatedAt   time.Time `json:"createdAt"`
}

const notificationColumns = `id, member, type, title, description, request_id, is_read, created_at`

func scanNotification(row pgx.Row) (*Notification, error) {
	var n Notification
	err := row.Scan(&n.ID, &n.Member, &n.Type, &n.Title, &n.Description, &n.RequestID, &n.IsRead, &n.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &n, err
}

// GetNotification returns one notification, or ErrNotFound.
func (s *Store) GetNotification(ctx context.Context, id int64) (*Notification, error) {
	return scanNotification(s.Pool.QueryRow(ctx, `SELECT `+notificationColumns+` FROM notifications WHERE id = $1`, id))
}

// ListNotifications returns `member`'s notifications, newest first.
func (s *Store) ListNotifications(ctx context.Context, member string, unreadOnly bool, limit int) ([]*Notification, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT `+notificationColumns+` FROM notifications
		WHERE member = $1 AND (NOT $2 OR NOT is_read)
		ORDER BY created_at DESC, id DESC LIMIT $3`, member, unreadOnly, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*Notification
	for rows.Next() {
		n, err := scanNotification(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

// MarkRead marks `member`'s own notification read; ErrNotFound otherwise.
func (s *Store) MarkRead(ctx context.Context, id int64, member string) error {
	tag, err := s.Pool.Exec(ctx, `UPDATE notifications SET is_read = true WHERE id = $1 AND member = $2`, id, member)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ResponsesFor returns `member`'s snapshot response for each of `requestIDs` they are in.
func (s *Store) ResponsesFor(ctx context.Context, member string, requestIDs []int64) (map[int64]string, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT request_id, response FROM snapshot_members WHERE member = $1 AND request_id = ANY($2)`,
		member, requestIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64]string{}
	for rows.Next() {
		var id int64
		var response string
		if err := rows.Scan(&id, &response); err != nil {
			return nil, err
		}
		out[id] = response
	}
	return out, rows.Err()
}

// ---------------------------------------------------------------- activity and member stats

// Activity is one on-chain member step on a request: a contribution or its refund. Who declined or
// did not answer is never listed (only counted, see SnapshotCounts), so helping stays a free choice.
type Activity struct {
	Type   string    `json:"type"` // contributed | refunded
	Member string    `json:"member"`
	Amount string    `json:"amount"`
	TxHash string    `json:"txHash"`
	At     time.Time `json:"at"`
}

// RequestActivity returns the contributions and refunds of a request, oldest first.
func (s *Store) RequestActivity(ctx context.Context, requestID int64) ([]Activity, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT 'contributed', member, amount::text, tx_hash, contributed_at
		FROM contributions WHERE request_id = $1
		UNION ALL
		SELECT 'refunded', member, amount::text, refund_tx_hash, refunded_at
		FROM contributions WHERE request_id = $1 AND refunded AND refunded_at IS NOT NULL
		ORDER BY 5, 1, 2`, requestID)
	if err != nil {
		return nil, err
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Activity, error) {
		var a Activity
		err := row.Scan(&a.Type, &a.Member, &a.Amount, &a.TxHash, &a.At)
		return a, err
	})
	if out == nil {
		out = []Activity{}
	}
	return out, err
}

// MemberStats sums up what moved through one member's wallet. Amounts are decimal strings in wei.
type MemberStats struct {
	Helped   int    `json:"helped"`   // contributions, refunded ones included
	Given    string `json:"given"`    // contributed and not refunded
	Refunded string `json:"refunded"` // contributions returned after a cancel
	Requests int    `json:"requests"` // requests the member opened
	Funded   int    `json:"funded"`   // of those, paid out
	Received string `json:"received"` // paid out to the member
}

// GetMemberStats returns `member`'s totals.
func (s *Store) GetMemberStats(ctx context.Context, member string) (*MemberStats, error) {
	var st MemberStats
	err := s.Pool.QueryRow(ctx, `
		SELECT (SELECT count(*) FROM contributions WHERE member = $1),
		       (SELECT coalesce(sum(amount), 0)::text FROM contributions WHERE member = $1 AND NOT refunded),
		       (SELECT coalesce(sum(amount), 0)::text FROM contributions WHERE member = $1 AND refunded),
		       (SELECT count(*) FROM requests WHERE requester = $1),
		       (SELECT count(*) FROM requests WHERE requester = $1 AND status = 'finalized'),
		       (SELECT coalesce(sum(collected), 0)::text FROM requests WHERE requester = $1 AND status = 'finalized')`,
		member).
		Scan(&st.Helped, &st.Given, &st.Refunded, &st.Requests, &st.Funded, &st.Received)
	return &st, err
}

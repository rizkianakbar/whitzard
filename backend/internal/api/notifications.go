package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/jackc/pgx/v5"

	"github.com/rizkianakbar/whitzard/backend/internal/store"
)

// GET /notifications?unread=true&limit=<n> → the caller's notifications, newest first.
func (s *Server) handleListNotifications(w http.ResponseWriter, r *http.Request) {
	limit, err := optionalInt(r.URL.Query().Get("limit"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "limit must be a number")
		return
	}
	list, err := s.store.ListNotifications(r.Context(), caller(r), r.URL.Query().Get("unread") == "true", int(limit))
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	if list == nil {
		list = []*store.Notification{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"notifications": list})
}

// POST /notifications/{id}/read
func (s *Server) handleMarkRead(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "notification id must be a number")
		return
	}
	switch err := s.store.MarkRead(r.Context(), id, caller(r)); {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "notification not found")
	case err != nil:
		s.internalError(w, r, err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

// GET /ws?token=<session token> → new notifications pushed as JSON while connected. Browsers
// cannot set headers on a WebSocket, hence the query parameter.
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if t, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer "); ok {
		token = t
	}
	member, err := s.sessionAddress(r.Context(), token)
	if token == "" || err != nil {
		writeError(w, http.StatusUnauthorized, "sign in first (?token=<session token>)")
		return
	}

	var origins []string
	for _, o := range s.cfg.CORSOrigins {
		if u, err := url.Parse(o); err == nil && u.Host != "" {
			origins = append(origins, u.Host)
		}
	}
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{OriginPatterns: origins})
	if err != nil {
		return // Accept has already answered
	}
	defer conn.CloseNow()

	ctx := conn.CloseRead(r.Context()) // the client only listens; this notices when it leaves
	sub, unsubscribe := s.hub.Subscribe(member)
	defer unsubscribe()

	ping := time.NewTicker(30 * time.Second)
	defer ping.Stop()
	for {
		select {
		case <-ctx.Done():
			conn.Close(websocket.StatusNormalClosure, "")
			return
		case n, ok := <-sub:
			if !ok {
				conn.Close(websocket.StatusTryAgainLater, "too slow; reconnect and fetch /notifications")
				return
			}
			writeCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
			err := wsjson.Write(writeCtx, conn, n)
			cancel()
			if err != nil {
				return
			}
		case <-ping.C:
			pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
			err := conn.Ping(pingCtx)
			cancel()
			if err != nil {
				return
			}
		}
	}
}

// Hub delivers new notifications to connected members. It LISTENs on store.NotifyChannel, so
// it works whether the indexer runs in this process or another one.
type Hub struct {
	store *store.Store
	log   *slog.Logger

	mu   sync.Mutex
	subs map[string]map[chan *store.Notification]struct{}
}

// NewHub creates a hub; call Run to start listening.
func NewHub(st *store.Store, log *slog.Logger) *Hub {
	return &Hub{store: st, log: log, subs: map[string]map[chan *store.Notification]struct{}{}}
}

// Subscribe returns a channel of `member`'s new notifications. The channel is closed if the
// subscriber falls too far behind.
func (h *Hub) Subscribe(member string) (<-chan *store.Notification, func()) {
	ch := make(chan *store.Notification, 32)
	h.mu.Lock()
	if h.subs[member] == nil {
		h.subs[member] = map[chan *store.Notification]struct{}{}
	}
	h.subs[member][ch] = struct{}{}
	h.mu.Unlock()
	return ch, func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		if _, ok := h.subs[member][ch]; ok {
			delete(h.subs[member], ch)
			close(ch)
		}
		if len(h.subs[member]) == 0 {
			delete(h.subs, member)
		}
	}
}

func (h *Hub) hasSubscribers(member string) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.subs[member]) > 0
}

func (h *Hub) deliver(n *store.Notification) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for ch := range h.subs[n.Member] {
		select {
		case ch <- n:
		default: // too slow: drop the subscriber; the client refetches on reconnect
			delete(h.subs[n.Member], ch)
			close(ch)
		}
	}
}

// Run listens for notifications until ctx ends, reconnecting after errors.
func (h *Hub) Run(ctx context.Context, databaseURL string) error {
	for {
		err := h.listen(ctx, databaseURL)
		if ctx.Err() != nil {
			return nil
		}
		h.log.Error("notification listener stopped; reconnecting", "err", err)
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(2 * time.Second):
		}
	}
}

func (h *Hub) listen(ctx context.Context, databaseURL string) error {
	conn, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		return err
	}
	defer conn.Close(context.Background())
	if _, err := conn.Exec(ctx, "LISTEN "+store.NotifyChannel); err != nil {
		return err
	}
	for {
		msg, err := conn.WaitForNotification(ctx)
		if err != nil {
			return err
		}
		var payload struct {
			ID     int64  `json:"id"`
			Member string `json:"member"`
		}
		if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
			h.log.Error("bad notification payload", "payload", msg.Payload)
			continue
		}
		if !h.hasSubscribers(payload.Member) {
			continue
		}
		n, err := h.store.GetNotification(ctx, payload.ID)
		if err != nil {
			h.log.Error("load notification", "id", payload.ID, "err", err)
			continue
		}
		h.deliver(n)
	}
}

// Package api is the REST + WebSocket API for the frontend. It serves
// off-chain data (profiles, evidence documents, responses, notifications) and the indexed mirror
// of the chain. It never sends transactions: members sign those in their own wallets.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	"github.com/rizkianakbar/whitzard/backend/internal/auth"
	"github.com/rizkianakbar/whitzard/backend/internal/chain"
	"github.com/rizkianakbar/whitzard/backend/internal/chain/bindings"
	"github.com/rizkianakbar/whitzard/backend/internal/evidence"
	"github.com/rizkianakbar/whitzard/backend/internal/store"
)

// Config configures the API.
type Config struct {
	SIWE           auth.Params
	NonceTTL       time.Duration // how long a sign-in message may be signed
	SessionTTL     time.Duration // how long a session token lives
	MaxUploadBytes int64         // evidence document size limit
	CORSOrigins    []string      // e.g. ["http://localhost:3000"]
}

// PhotoTypes are the accepted profile photo types.
var PhotoTypes = map[string]bool{"image/png": true, "image/jpeg": true, "image/webp": true}

// Contracts are read-only views of the deployed contracts.
type Contracts struct {
	Token    *bindings.WhitzardTokenCaller
	Registry *bindings.RegistryCaller
	Escrow   *bindings.EscrowCaller
}

// NewContracts binds read-only callers to the deployed addresses.
func NewContracts(caller bind.ContractCaller, token, registry, escrow common.Address) (Contracts, error) {
	t, err := bindings.NewWhitzardTokenCaller(token, caller)
	if err != nil {
		return Contracts{}, err
	}
	r, err := bindings.NewRegistryCaller(registry, caller)
	if err != nil {
		return Contracts{}, err
	}
	e, err := bindings.NewEscrowCaller(escrow, caller)
	if err != nil {
		return Contracts{}, err
	}
	return Contracts{t, r, e}, nil
}

// Server serves the API.
type Server struct {
	cfg      Config
	store    *store.Store
	evidence *evidence.Disk
	photos   *evidence.Disk
	chain    Contracts
	hub      *Hub
	log      *slog.Logger
	now      func() time.Time
	sessions sessionCache
}

// New builds the server; photos should accept images only (PhotoTypes). Run hub.Run separately
// for live notifications.
func New(cfg Config, st *store.Store, ev, photos *evidence.Disk, contracts Contracts, hub *Hub, log *slog.Logger) *Server {
	if cfg.NonceTTL == 0 {
		cfg.NonceTTL = 10 * time.Minute
	}
	if cfg.SessionTTL == 0 {
		cfg.SessionTTL = 7 * 24 * time.Hour
	}
	if cfg.MaxUploadBytes == 0 {
		cfg.MaxUploadBytes = 10 << 20
	}
	return &Server{cfg: cfg, store: st, evidence: ev, photos: photos, chain: contracts, hub: hub, log: log, now: time.Now}
}

// Handler returns the routed handler with CORS.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /auth/nonce", s.handleNonce)
	mux.HandleFunc("POST /auth/verify", s.handleVerify)
	mux.HandleFunc("POST /auth/logout", s.authed(s.handleLogout))

	mux.HandleFunc("GET /stats", s.handleStats)

	mux.HandleFunc("GET /members", s.authed(s.handleListMembers))
	mux.HandleFunc("GET /members/{address}", s.handleGetMember)
	mux.HandleFunc("GET /members/{address}/photo", s.authed(s.handleGetPhoto))
	mux.HandleFunc("PUT /members/me", s.authed(s.handleUpdateMe))
	mux.HandleFunc("PUT /members/me/photo", s.authed(s.handleSetPhoto))
	mux.HandleFunc("DELETE /members/me/photo", s.authed(s.handleDeletePhoto))
	mux.HandleFunc("GET /members/me/proof", s.authed(s.handleProof))
	mux.HandleFunc("GET /members/me/refunds", s.authed(s.handleRefunds))
	mux.HandleFunc("GET /members/me/stats", s.authed(s.handleMemberStats))

	mux.HandleFunc("POST /requests", s.authed(s.handleCreateDraft))
	// Request stories are health-related, so only signed-in members may read them.
	mux.HandleFunc("GET /requests", s.authed(s.handleListRequests))
	mux.HandleFunc("GET /requests/{id}", s.authed(s.handleGetRequest))
	mux.HandleFunc("GET /requests/{id}/evidence", s.authed(s.handleEvidence))
	mux.HandleFunc("GET /requests/{id}/activity", s.authed(s.handleActivity))
	mux.HandleFunc("POST /requests/{id}/contribute", s.authed(s.handleRespond))
	mux.HandleFunc("POST /requests/{id}/comments", s.authed(s.handleComment))

	mux.HandleFunc("GET /notifications", s.authed(s.handleListNotifications))
	mux.HandleFunc("POST /notifications/{id}/read", s.authed(s.handleMarkRead))
	mux.HandleFunc("GET /ws", s.handleWebSocket)

	return s.cors(mux)
}

// ---------------------------------------------------------------- auth helpers

type ctxKey struct{}

// authed requires a valid session and puts the caller's address in the request context.
func (s *Server) authed(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || token == "" {
			writeError(w, http.StatusUnauthorized, "sign in first (Authorization: Bearer <token>)")
			return
		}
		address, err := s.sessionAddress(r.Context(), token)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "session expired or invalid; sign in again")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, address)))
	}
}

func (s *Server) sessionAddress(ctx context.Context, token string) (string, error) {
	hash := auth.HashToken(token)
	if address, ok := s.sessions.get(hash, s.now()); ok {
		return address, nil
	}
	address, err := s.store.SessionAddress(ctx, hash)
	if err == nil {
		s.sessions.put(hash, address, s.now())
	}
	return address, err
}

// caller is the signed-in address (lowercase); only valid inside `authed` handlers.
func caller(r *http.Request) string {
	address, _ := r.Context().Value(ctxKey{}).(string)
	return address
}

// optionalCaller returns the signed-in address if a valid token is present, else "".
func (s *Server) optionalCaller(r *http.Request) string {
	token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !ok || token == "" {
		return ""
	}
	address, err := s.sessionAddress(r.Context(), token)
	if err != nil {
		return ""
	}
	return address
}

// ---------------------------------------------------------------- CORS

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && slices.Contains(s.cfg.CORSOrigins, origin) {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Vary", "Origin")
			h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			h.Set("Access-Control-Expose-Headers", "Content-Disposition, X-Evidence-Sha256")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

// ---------------------------------------------------------------- JSON helpers

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// internalError logs the cause and answers 500 without leaking it.
func (s *Server) internalError(w http.ResponseWriter, r *http.Request, err error) {
	s.log.Error("request failed", "method", r.Method, "path", r.URL.Path, "err", err)
	writeError(w, http.StatusInternalServerError, "internal error")
}

// chainError answers 502 when the RPC provider fails.
func (s *Server) chainError(w http.ResponseWriter, r *http.Request, err error) {
	s.log.Error("chain read failed", "method", r.Method, "path", r.URL.Path, "err", err)
	writeError(w, http.StatusBadGateway, "could not read the blockchain; try again")
}

// decodeJSON reads a small JSON body, rejecting unknown fields.
func decodeJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10))
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body: "+err.Error())
		return false
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "invalid JSON body: trailing data")
		return false
	}
	return true
}

// parseAddress accepts any 0x-hex address and returns it lowercase.
func parseAddress(v string) (common.Address, string, bool) {
	if !common.IsHexAddress(v) {
		return common.Address{}, "", false
	}
	a := common.HexToAddress(v)
	return a, chain.Addr(a), true
}

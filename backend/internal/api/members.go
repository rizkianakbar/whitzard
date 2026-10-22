package api

import (
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/rizkianakbar/whitzard/backend/internal/auth"
	"github.com/rizkianakbar/whitzard/backend/internal/evidence"
	"github.com/rizkianakbar/whitzard/backend/internal/store"
)

// ---------------------------------------------------------------- sign-in

// GET /auth/nonce?address=0x… → the exact EIP-4361 message the wallet must sign.
func (s *Server) handleNonce(w http.ResponseWriter, r *http.Request) {
	addr, lower, ok := parseAddress(r.URL.Query().Get("address"))
	if !ok {
		writeError(w, http.StatusBadRequest, "address query parameter must be an Ethereum address")
		return
	}
	nonce := auth.NewNonce()
	issued := s.now().UTC().Truncate(time.Second)
	expires := issued.Add(s.cfg.NonceTTL)
	message := s.cfg.SIWE.Message(addr, nonce, issued, expires)
	if err := s.store.CreateNonce(r.Context(), nonce, lower, message, expires); err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"nonce": nonce, "message": message, "expiresAt": expires})
}

// POST /auth/verify {address, nonce, signature} → session token. The nonce is used up by the
// first attempt, valid or not.
func (s *Server) handleVerify(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Address   string `json:"address"`
		Nonce     string `json:"nonce"`
		Signature string `json:"signature"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	addr, lower, ok := parseAddress(body.Address)
	if !ok {
		writeError(w, http.StatusBadRequest, "address must be an Ethereum address")
		return
	}
	message, err := s.store.ConsumeNonce(r.Context(), body.Nonce, lower)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "unknown, expired or already used nonce; request a new one")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	if err := auth.Verify(addr, message, body.Signature); err != nil {
		writeError(w, http.StatusUnauthorized, "signature does not match the address")
		return
	}
	token, hash := auth.NewSessionToken()
	expires := s.now().UTC().Add(s.cfg.SessionTTL)
	if err := s.store.CreateSession(r.Context(), hash, lower, expires); err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "address": lower, "expiresAt": expires})
}

// POST /auth/logout
func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	token, _ := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if err := s.store.DeleteSession(r.Context(), auth.HashToken(token)); err != nil {
		s.internalError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------------------------------------------------------------- members

type memberChainState struct {
	Registered        bool   `json:"registered"`
	Ready             bool   `json:"ready"`
	HasParticipated   bool   `json:"hasParticipated"`
	RequestCount      string `json:"requestCount"`
	Balance           string `json:"balance"`
	FaucetClaimed     string `json:"faucetClaimed"`
	FaucetNextClaimAt string `json:"faucetNextClaimAt"` // unix seconds; 0 or past = claimable now
}

// GET /members/{address} (or /members/me when signed in): profile + live chain state. An address
// that never registered still gets its chain state, with a null profile.
func (s *Server) handleGetMember(w http.ResponseWriter, r *http.Request) {
	param := r.PathValue("address")
	if param == "me" {
		me := s.optionalCaller(r)
		if me == "" {
			writeError(w, http.StatusUnauthorized, "sign in first (Authorization: Bearer <token>)")
			return
		}
		param = me
	}
	addr, lower, ok := parseAddress(param)
	if !ok {
		writeError(w, http.StatusBadRequest, "not an Ethereum address")
		return
	}

	profile, err := s.store.GetMember(r.Context(), lower)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		s.internalError(w, r, err)
		return
	}

	// Each read runs only if the previous ones succeeded; the first error is reported.
	opts := &bind.CallOpts{Context: r.Context()}
	var state memberChainState
	var readErr error
	read := func(f func() error) {
		if readErr == nil {
			readErr = f()
		}
	}
	readInt := func(dst *string, f func(*bind.CallOpts, common.Address) (*big.Int, error)) {
		read(func() error {
			v, err := f(opts, addr)
			if err == nil {
				*dst = v.String()
			}
			return err
		})
	}
	read(func() (err error) { state.Registered, err = s.chain.Registry.IsRegistered(opts, addr); return })
	read(func() (err error) { state.Ready, err = s.chain.Registry.IsReady(opts, addr); return })
	read(func() (err error) { state.HasParticipated, err = s.chain.Registry.HasParticipated(opts, addr); return })
	readInt(&state.RequestCount, s.chain.Registry.RequestCount)
	readInt(&state.Balance, s.chain.Token.BalanceOf)
	readInt(&state.FaucetClaimed, s.chain.Token.ClaimedTotal)
	readInt(&state.FaucetNextClaimAt, s.chain.Token.NextClaimAt)
	if readErr != nil {
		s.chainError(w, r, readErr)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"address": lower, "profile": profileView(profile, s.optionalCaller(r)), "chain": state})
}

// GET /members → every registered member's profile (as profileView shows it), ready ones first.
// Profiles only: the live chain state stays per member (GET /members/{address}).
func (s *Server) handleListMembers(w http.ResponseWriter, r *http.Request) {
	members, err := s.store.ListMembers(r.Context())
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	viewer := caller(r)
	out := make([]any, len(members))
	for i, m := range members {
		out[i] = listProfileView(m, viewer)
	}
	writeJSON(w, http.StatusOK, map[string]any{"members": out})
}

func listProfileView(m *store.Member, viewer string) any {
	if m == nil {
		return nil
	}
	v := *m
	if viewer == "" {
		v.City = nil
	}
	return v
}

// profileView is a member's profile as the viewer may see it: birth date and email only for the
// member themself, city only for signed-in viewers.
func profileView(m *store.Member, viewer string) any {
	if m == nil {
		return nil
	}
	v := struct {
		store.Member
		BirthDate *string `json:"birthDate,omitempty"`
		Email     *string `json:"email,omitempty"`
	}{Member: *m}
	if viewer == "" {
		v.City = nil
	}
	if viewer == m.Address && m.BirthDate != nil {
		d := m.BirthDate.Format(time.DateOnly)
		v.BirthDate = &d
	}
	if viewer == m.Address {
		v.Email = m.Email
	}
	return v
}

// PUT /members/me {displayName, nickname, birthDate, city, email}: replaces the profile (missing
// or empty fields are cleared), for registered members. Nothing here is verified.
func (s *Server) handleUpdateMe(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DisplayName *string `json:"displayName"`
		Nickname    *string `json:"nickname"`
		BirthDate   *string `json:"birthDate"` // YYYY-MM-DD
		City        *string `json:"city"`
		Email       *string `json:"email"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	var p store.Profile
	for _, f := range []struct {
		name string
		in   *string
		max  int
		out  **string
	}{
		{"displayName", body.DisplayName, 50, &p.DisplayName},
		{"nickname", body.Nickname, 30, &p.Nickname},
		{"city", body.City, 60, &p.City},
	} {
		if f.in == nil {
			continue
		}
		v := strings.TrimSpace(*f.in)
		if utf8.RuneCountInString(v) > f.max {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("%s is at most %d characters", f.name, f.max))
			return
		}
		if v != "" {
			*f.out = &v
		}
	}
	if body.BirthDate != nil && *body.BirthDate != "" {
		d, err := time.Parse(time.DateOnly, *body.BirthDate)
		today := s.now().UTC().Truncate(24 * time.Hour)
		if err != nil || d.After(today) || d.Before(today.AddDate(-120, 0, 0)) {
			writeError(w, http.StatusBadRequest, "birthDate must be a past date as YYYY-MM-DD")
			return
		}
		p.BirthDate = &d
	}
	if body.Email != nil {
		v := strings.TrimSpace(*body.Email)
		if v != "" {
			parsed, err := mail.ParseAddress(v)
			if err != nil || !strings.EqualFold(parsed.Address, v) {
				writeError(w, http.StatusBadRequest, "email must be a valid address")
				return
			}
			v = strings.ToLower(v)
			if utf8.RuneCountInString(v) > 254 {
				writeError(w, http.StatusBadRequest, "email is at most 254 characters")
				return
			}
			p.Email = &v
		}
	}

	err := s.store.SetProfile(r.Context(), caller(r), p)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusConflict, "register on-chain first (Registry.register)")
		return
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		writeError(w, http.StatusConflict, "email is already used by another member")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	s.writeOwnProfile(w, r)
}

// PUT /members/me/photo multipart `file` (PNG, JPEG or WebP): sets the profile photo.
func (s *Server) handleSetPhoto(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, s.photos.MaxBytes+64<<10)
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "expected multipart/form-data with a file")
		return
	}
	defer file.Close()
	saved, err := s.photos.Save(file)
	switch {
	case errors.Is(err, evidence.ErrTooLarge):
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("photo is larger than %d bytes", s.photos.MaxBytes))
		return
	case errors.Is(err, evidence.ErrType), errors.Is(err, evidence.ErrEmpty):
		writeError(w, http.StatusUnsupportedMediaType, "photo must be a PNG, JPEG or WebP image")
		return
	case err != nil:
		s.internalError(w, r, err)
		return
	}
	s.setPhoto(w, r, &saved.Hash, &saved.ContentType)
}

// DELETE /members/me/photo: removes the profile photo.
func (s *Server) handleDeletePhoto(w http.ResponseWriter, r *http.Request) {
	s.setPhoto(w, r, nil, nil)
}

func (s *Server) setPhoto(w http.ResponseWriter, r *http.Request, hash, contentType *string) {
	err := s.store.SetPhoto(r.Context(), caller(r), hash, contentType)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusConflict, "register on-chain first (Registry.register)")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	s.writeOwnProfile(w, r)
}

func (s *Server) writeOwnProfile(w http.ResponseWriter, r *http.Request) {
	profile, err := s.store.GetMember(r.Context(), caller(r))
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, profileView(profile, caller(r)))
}

// GET /members/{address}/photo → the profile photo, for signed-in viewers.
func (s *Server) handleGetPhoto(w http.ResponseWriter, r *http.Request) {
	_, lower, ok := parseAddress(r.PathValue("address"))
	if !ok {
		writeError(w, http.StatusBadRequest, "not an Ethereum address")
		return
	}
	m, err := s.store.GetMember(r.Context(), lower)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		s.internalError(w, r, err)
		return
	}
	if m == nil || m.Photo == nil {
		writeError(w, http.StatusNotFound, "no photo")
		return
	}
	f, err := s.photos.Open(*m.Photo)
	if errors.Is(err, evidence.ErrNotFound) {
		writeError(w, http.StatusNotFound, "photo missing from storage")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	defer f.Close()
	h := w.Header()
	h.Set("Content-Type", *m.PhotoType)
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Cache-Control", "private, max-age=86400")
	http.ServeContent(w, r, "", time.Time{}, f)
}

// GET /stats → community totals for the public landing page (no personal or health data).
func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	st, err := s.store.GetStats(r.Context())
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

// GET /members/me/stats → the caller's own totals: what they gave, got back and received.
func (s *Server) handleMemberStats(w http.ResponseWriter, r *http.Request) {
	st, err := s.store.GetMemberStats(r.Context(), caller(r))
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

// GET /members/me/proof → the proofId to pass to Escrow.openRequest. The first request needs no
// proof (0). Otherwise the newest contribution the chain accepts is returned, or null if none.
func (s *Server) handleProof(w http.ResponseWriter, r *http.Request) {
	me := caller(r)
	addr, _, _ := parseAddress(me)
	opts := &bind.CallOpts{Context: r.Context()}

	count, err := s.chain.Registry.RequestCount(opts, addr)
	if err != nil {
		s.chainError(w, r, err)
		return
	}
	if count.Sign() == 0 {
		ok, err := s.chain.Escrow.CanOpenRequest(opts, addr, big.NewInt(0))
		if err != nil {
			s.chainError(w, r, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"needed": false, "proofId": "0", "canOpenRequest": ok})
		return
	}

	candidates, err := s.store.ProofCandidates(r.Context(), me, 20)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	for _, id := range candidates {
		ok, err := s.chain.Escrow.CanOpenRequest(opts, addr, big.NewInt(id))
		if err != nil {
			s.chainError(w, r, err)
			return
		}
		if ok {
			writeJSON(w, http.StatusOK, map[string]any{"needed": true, "proofId": big.NewInt(id).String(), "canOpenRequest": true})
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"needed": true, "proofId": nil, "canOpenRequest": false})
}

// GET /members/me/refunds → contributions to cancelled requests not yet claimed back. The amounts
// come from Escrow.pendingRefunds, so they are what claimRefund would actually pay.
func (s *Server) handleRefunds(w http.ResponseWriter, r *http.Request) {
	me := caller(r)
	addr, _, _ := parseAddress(me)
	ids, err := s.store.RefundCandidates(r.Context(), me)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	type refund struct {
		RequestID string `json:"requestId"`
		Amount    string `json:"amount"`
	}
	out := []refund{}
	total := big.NewInt(0)
	if len(ids) > 0 {
		bigIDs := make([]*big.Int, len(ids))
		for i, id := range ids {
			bigIDs[i] = big.NewInt(id)
		}
		res, err := s.chain.Escrow.PendingRefunds(&bind.CallOpts{Context: r.Context()}, addr, bigIDs)
		if err != nil {
			s.chainError(w, r, err)
			return
		}
		for i, amount := range res.Amounts {
			if amount.Sign() > 0 {
				out = append(out, refund{bigIDs[i].String(), amount.String()})
			}
		}
		total = res.Total
	}
	writeJSON(w, http.StatusOK, map[string]any{"total": total.String(), "refunds": out})
}

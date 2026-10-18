package api

import (
	"errors"
	"math/big"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	"github.com/rizkianakbar/whitzard/backend/internal/auth"
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

	writeJSON(w, http.StatusOK, map[string]any{"address": lower, "profile": profile, "chain": state})
}

// PUT /members/me {displayName}: profile edit, for registered members.
func (s *Server) handleUpdateMe(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DisplayName *string `json:"displayName"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.DisplayName != nil {
		name := strings.TrimSpace(*body.DisplayName)
		if utf8.RuneCountInString(name) > 50 {
			writeError(w, http.StatusBadRequest, "displayName is at most 50 characters")
			return
		}
		if name == "" {
			body.DisplayName = nil
		} else {
			body.DisplayName = &name
		}
	}
	err := s.store.SetDisplayName(r.Context(), caller(r), body.DisplayName)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusConflict, "register on-chain first (Registry.register)")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	profile, err := s.store.GetMember(r.Context(), caller(r))
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, profile)
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

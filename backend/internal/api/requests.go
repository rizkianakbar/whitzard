package api

import (
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/rizkianakbar/whitzard/backend/internal/evidence"
	"github.com/rizkianakbar/whitzard/backend/internal/store"
)

const (
	maxTitle       = 120
	maxDescription = 5000
)

// requestView is a request as the API shows it.
type requestView struct {
	*store.Request
	// Status follows the contract (thesis Tabel 3.4): open, funding, finalized, expired, cancelled.
	// After the deadline a funded request stays "funding" until finalize, with AwaitingFinalize set.
	Status           string `json:"status"`
	AwaitingFinalize bool   `json:"awaitingFinalize"`
	// YourResponse is the signed-in caller's snapshot response, when listing with member=me.
	YourResponse *string `json:"yourResponse,omitempty"`
}

func (s *Server) view(r *store.Request) requestView {
	status, awaiting := r.StoredStatus, false
	if (status == "open" || status == "funding") && !s.now().Before(r.Deadline) {
		if r.Collected == "0" {
			status = "expired"
		} else {
			status, awaiting = "funding", true
		}
	}
	return requestView{Request: r, Status: status, AwaitingFinalize: awaiting}
}

// acceptsContributions reports whether the request is still open for contributions.
func (v requestView) acceptsContributions() bool {
	return (v.Status == "open" || v.Status == "funding") && !v.AwaitingFinalize
}

// POST /requests (multipart: title, description, file) → the draft and its evidenceHash. The
// frontend then sends Escrow.openRequest(amount, duration, evidenceHash, proofId) from the
// requester's wallet; the indexer links this draft when RequestOpened arrives.
func (s *Server) handleCreateDraft(w http.ResponseWriter, r *http.Request) {
	me := caller(r)
	if _, err := s.store.GetMember(r.Context(), me); errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusForbidden, "register on-chain first (Registry.register)")
		return
	} else if err != nil {
		s.internalError(w, r, err)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxUploadBytes+64<<10)
	reader, err := r.MultipartReader()
	if err != nil {
		writeError(w, http.StatusBadRequest, "expected multipart/form-data with title, description and file")
		return
	}
	var title, description, fileName string
	var saved *evidence.Saved
	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			writeError(w, http.StatusBadRequest, "malformed multipart body or too large")
			return
		}
		switch part.FormName() {
		case "title", "description":
			value, err := io.ReadAll(io.LimitReader(part, maxDescription*4+1))
			if err != nil {
				writeError(w, http.StatusBadRequest, "could not read "+part.FormName())
				return
			}
			if part.FormName() == "title" {
				title = strings.TrimSpace(string(value))
			} else {
				description = strings.TrimSpace(string(value))
			}
		case "file":
			if saved != nil {
				writeError(w, http.StatusBadRequest, "only one file is allowed")
				return
			}
			fileName = cleanFileName(part.FileName())
			sv, err := s.evidence.Save(part)
			switch {
			case errors.Is(err, evidence.ErrTooLarge):
				writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("document is larger than %d bytes", s.cfg.MaxUploadBytes))
				return
			case errors.Is(err, evidence.ErrType), errors.Is(err, evidence.ErrEmpty):
				writeError(w, http.StatusUnsupportedMediaType, err.Error())
				return
			case err != nil:
				writeError(w, http.StatusBadRequest, "could not read the document")
				return
			}
			saved = &sv
		}
		part.Close()
	}

	switch {
	case title == "" || utf8.RuneCountInString(title) > maxTitle:
		writeError(w, http.StatusBadRequest, fmt.Sprintf("title is required, at most %d characters", maxTitle))
		return
	case description == "" || utf8.RuneCountInString(description) > maxDescription:
		writeError(w, http.StatusBadRequest, fmt.Sprintf("description is required, at most %d characters", maxDescription))
		return
	case saved == nil:
		writeError(w, http.StatusBadRequest, "file (the evidence document) is required")
		return
	}

	id, err := s.store.CreateDraft(r.Context(), store.Draft{
		Requester: me, Title: title, Description: description, EvidenceHash: saved.Hash,
		FileName: fileName, ContentType: saved.ContentType, Size: saved.Size,
	})
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"draftId":      id,
		"evidenceHash": saved.Hash,
		"contentType":  saved.ContentType,
		"size":         saved.Size,
	})
}

// GET /requests?requester=0x…&member=0x…|me&before=<id>&limit=<n> → newest first.
func (s *Server) handleListRequests(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var f store.RequestFilter
	if v := q.Get("requester"); v != "" {
		_, lower, ok := parseAddress(v)
		if !ok {
			writeError(w, http.StatusBadRequest, "requester must be an Ethereum address")
			return
		}
		f.Requester = lower
	}
	me := ""
	if v := q.Get("member"); v != "" {
		if v == "me" {
			me = caller(r)
			v = me
		}
		_, lower, ok := parseAddress(v)
		if !ok {
			writeError(w, http.StatusBadRequest, "member must be an Ethereum address or me")
			return
		}
		f.Member = lower
	}
	var err error
	if f.BeforeID, err = optionalInt(q.Get("before")); err != nil {
		writeError(w, http.StatusBadRequest, "before must be a request id")
		return
	}
	limit, err := optionalInt(q.Get("limit"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "limit must be a number")
		return
	}
	f.Limit = int(limit)

	requests, err := s.store.ListRequests(r.Context(), f)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	out := make([]requestView, len(requests))
	ids := make([]int64, len(requests))
	for i, req := range requests {
		out[i], ids[i] = s.view(req), req.ID
	}
	if me != "" && len(ids) > 0 {
		responses, err := s.store.ResponsesFor(r.Context(), me, ids)
		if err != nil {
			s.internalError(w, r, err)
			return
		}
		for i := range out {
			if response, ok := responses[out[i].ID]; ok {
				out[i].YourResponse = &response
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"requests": out})
}

// GET /requests/{id} → the request, its snapshot response counts and the caller's own position.
func (s *Server) handleGetRequest(w http.ResponseWriter, r *http.Request) {
	req, ok := s.loadRequest(w, r)
	if !ok {
		return
	}
	counts, err := s.store.SnapshotCounts(r.Context(), req.ID)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	body := map[string]any{"request": s.view(req), "responses": counts}
	comments, err := s.store.ListComments(r.Context(), req.ID)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	body["comments"] = comments

	me := caller(r)
	you := map[string]any{"isRequester": me == req.Requester, "inSnapshot": false, "response": nil, "contribution": nil}
	if response, err := s.store.SnapshotResponse(r.Context(), req.ID, me); err == nil {
		you["inSnapshot"], you["response"] = true, response
	} else if !errors.Is(err, store.ErrNotFound) {
		s.internalError(w, r, err)
		return
	}
	if c, err := s.store.GetContribution(r.Context(), req.ID, me); err == nil {
		you["contribution"] = c
	} else if !errors.Is(err, store.ErrNotFound) {
		s.internalError(w, r, err)
		return
	}
	body["you"] = you
	writeJSON(w, http.StatusOK, body)
}

// POST /requests/{id}/comments {body}: adds one discussion message.
func (s *Server) handleComment(w http.ResponseWriter, r *http.Request) {
	req, ok := s.loadRequest(w, r)
	if !ok {
		return
	}
	var body struct {
		Body string `json:"body"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	text := strings.TrimSpace(body.Body)
	if text == "" {
		writeError(w, http.StatusBadRequest, "comment body is required")
		return
	}
	if utf8.RuneCountInString(text) > 1000 {
		writeError(w, http.StatusBadRequest, "comment body is at most 1000 characters")
		return
	}
	comment, err := s.store.AddComment(r.Context(), req.ID, caller(r), text)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, comment)
}

// GET /requests/{id}/activity → the request's contributions and refunds with their transactions,
// oldest first. Declines and non-answers are only counted (GET /requests/{id}), never named.
func (s *Server) handleActivity(w http.ResponseWriter, r *http.Request) {
	req, ok := s.loadRequest(w, r)
	if !ok {
		return
	}
	activity, err := s.store.RequestActivity(r.Context(), req.ID)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"activity": activity})
}

// GET /requests/{id}/evidence → the document, only for the requester and snapshot members.
func (s *Server) handleEvidence(w http.ResponseWriter, r *http.Request) {
	req, ok := s.loadRequest(w, r)
	if !ok {
		return
	}
	me := caller(r)
	if me != req.Requester {
		if _, err := s.store.SnapshotResponse(r.Context(), req.ID, me); errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusForbidden, "only the requester and members in this request's snapshot may see the evidence")
			return
		} else if err != nil {
			s.internalError(w, r, err)
			return
		}
	}
	hash, fileName, contentType, err := s.store.EvidenceFile(r.Context(), req.ID)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "no document was uploaded for this request")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	f, err := s.evidence.Open(hash)
	if errors.Is(err, evidence.ErrNotFound) {
		writeError(w, http.StatusNotFound, "document missing from storage")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	defer f.Close()

	h := w.Header()
	h.Set("Content-Type", contentType)
	h.Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": fileName}))
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Cache-Control", "private, no-store")
	h.Set("X-Evidence-Sha256", hash)
	http.ServeContent(w, r, "", time.Time{}, f)
}

// POST /requests/{id}/contribute {response: "participate" | "decline"}: records the member's
// answer (thesis entity 4). The contribution itself is a wallet transaction; once the indexer
// sees it, the response becomes "contributed" and can no longer change.
func (s *Server) handleRespond(w http.ResponseWriter, r *http.Request) {
	req, ok := s.loadRequest(w, r)
	if !ok {
		return
	}
	var body struct {
		Response string `json:"response"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	response := map[string]string{"participate": "participating", "decline": "declined"}[body.Response]
	if response == "" {
		writeError(w, http.StatusBadRequest, `response must be "participate" or "decline"`)
		return
	}
	me := caller(r)
	if me == req.Requester {
		writeError(w, http.StatusForbidden, "the requester cannot respond to their own request")
		return
	}
	if !s.view(req).acceptsContributions() {
		writeError(w, http.StatusConflict, "this request no longer accepts contributions")
		return
	}
	switch err := s.store.SetResponse(r.Context(), req.ID, me, response); {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusForbidden, "you are not in this request's snapshot")
	case errors.Is(err, store.ErrAlreadyContributed):
		writeError(w, http.StatusConflict, "you already contributed to this request")
	case err != nil:
		s.internalError(w, r, err)
	default:
		writeJSON(w, http.StatusOK, map[string]string{"response": response})
	}
}

func (s *Server) loadRequest(w http.ResponseWriter, r *http.Request) (*store.Request, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "request id must be a positive number")
		return nil, false
	}
	req, err := s.store.GetRequest(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "request not found (it may not be indexed yet)")
		return nil, false
	}
	if err != nil {
		s.internalError(w, r, err)
		return nil, false
	}
	return req, true
}

func optionalInt(v string) (int64, error) {
	if v == "" {
		return 0, nil
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n < 0 {
		return 0, errors.New("invalid")
	}
	return n, nil
}

// cleanFileName keeps only a safe display name for Content-Disposition.
func cleanFileName(name string) string {
	name = name[strings.LastIndexAny(name, `/\`)+1:]
	name = strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f || r == '"' {
			return -1
		}
		return r
	}, name)
	if name == "" {
		return "evidence"
	}
	if utf8.RuneCountInString(name) > 100 {
		name = string([]rune(name)[:100])
	}
	return name
}

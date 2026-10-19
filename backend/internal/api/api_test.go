package api_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"math/big"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/rizkianakbar/whitzard/backend/internal/api"
	"github.com/rizkianakbar/whitzard/backend/internal/auth"
	"github.com/rizkianakbar/whitzard/backend/internal/chain"
	"github.com/rizkianakbar/whitzard/backend/internal/evidence"
	"github.com/rizkianakbar/whitzard/backend/internal/indexer"
	"github.com/rizkianakbar/whitzard/backend/internal/store"
	"github.com/rizkianakbar/whitzard/backend/internal/testutil"
)

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

var pdf = append([]byte("%PDF-1.7\n"), bytes.Repeat([]byte("hospital bill\n"), 50)...)

type env struct {
	t     *testing.T
	chain *testutil.Chain
	st    *store.Store
	ix    *indexer.Indexer
	srv   *httptest.Server

	alice, bob, carol, dave, eve *testutil.Account // eve: registered, never Ready
}

func newEnv(t *testing.T) *env {
	t.Helper()
	e := &env{t: t, chain: testutil.NewChain(t, 6, true), st: testutil.NewStore(t)}
	a := e.chain.Accounts
	e.alice, e.bob, e.carol, e.dave, e.eve = a[0], a[1], a[2], a[3], a[4]
	for _, m := range []*testutil.Account{e.alice, e.bob, e.carol, e.dave} {
		e.chain.Join(m, true)
	}
	e.chain.Join(e.eve, false)
	e.chain.Mine(1)

	ctx := context.Background()
	var err error
	e.ix, err = indexer.New(ctx, indexer.Config{
		Name: "test", Registry: e.chain.RegistryAddr, Escrow: e.chain.EscrowAddr, StartBlock: e.chain.DeployBlock,
	}, e.chain.Client, e.st, quiet)
	if err != nil {
		t.Fatal(err)
	}
	disk, err := evidence.NewDisk(t.TempDir(), 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	photos, err := evidence.NewDisk(t.TempDir(), 64<<10)
	if err != nil {
		t.Fatal(err)
	}
	photos.Types = api.PhotoTypes
	contracts, err := api.NewContracts(e.chain.Client, e.chain.TokenAddr, e.chain.RegistryAddr, e.chain.EscrowAddr)
	if err != nil {
		t.Fatal(err)
	}
	hub := api.NewHub(e.st, quiet)
	hubCtx, cancel := context.WithCancel(ctx)
	t.Cleanup(cancel)
	go hub.Run(hubCtx, e.st.Pool.Config().ConnString())

	server := api.New(api.Config{
		SIWE:           auth.Params{Domain: "localhost:3000", URI: "http://localhost:3000", ChainID: 1337},
		MaxUploadBytes: 1 << 20,
		CORSOrigins:    []string{"http://localhost:3000"},
	}, e.st, disk, photos, contracts, hub, quiet)
	e.srv = httptest.NewServer(server.Handler())
	t.Cleanup(e.srv.Close)
	e.sync()
	return e
}

func (e *env) sync() {
	e.t.Helper()
	if _, err := e.ix.SyncOnce(context.Background()); err != nil {
		e.t.Fatal(err)
	}
}

type response struct {
	status int
	body   []byte
	header http.Header
}

func (r response) json(t *testing.T) map[string]any {
	t.Helper()
	var v map[string]any
	if err := json.Unmarshal(r.body, &v); err != nil {
		t.Fatalf("decode %q: %v", r.body, err)
	}
	return v
}

func (e *env) do(method, path, token string, body io.Reader, contentType string) response {
	e.t.Helper()
	req, err := http.NewRequest(method, e.srv.URL+path, body)
	if err != nil {
		e.t.Fatal(err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		e.t.Fatal(err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	return response{res.StatusCode, b, res.Header}
}

func (e *env) get(path, token string) response { return e.do("GET", path, token, nil, "") }

func (e *env) post(path, token string, v any) response {
	b, _ := json.Marshal(v)
	return e.do("POST", path, token, bytes.NewReader(b), "application/json")
}

func expect(t *testing.T, r response, status int) {
	t.Helper()
	if r.status != status {
		t.Fatalf("status %d, want %d: %s", r.status, status, r.body)
	}
}

// personalSign signs like a wallet does.
func personalSign(t *testing.T, a *testutil.Account, message string) string {
	t.Helper()
	sig, err := crypto.Sign(accounts.TextHash([]byte(message)), a.Key)
	if err != nil {
		t.Fatal(err)
	}
	sig[64] += 27
	return hexutil.Encode(sig)
}

func (e *env) login(a *testutil.Account) string {
	e.t.Helper()
	nonce := e.get("/auth/nonce?address="+a.Addr.Hex(), "")
	expect(e.t, nonce, 200)
	n := nonce.json(e.t)
	verify := e.post("/auth/verify", "", map[string]string{
		"address": a.Addr.Hex(), "nonce": n["nonce"].(string), "signature": personalSign(e.t, a, n["message"].(string)),
	})
	expect(e.t, verify, 200)
	return verify.json(e.t)["token"].(string)
}

func (e *env) upload(token, title, description string, file []byte) response {
	e.t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	_ = w.WriteField("title", title)
	_ = w.WriteField("description", description)
	if file != nil {
		fw, _ := w.CreateFormFile("file", "bill.pdf")
		_, _ = fw.Write(file)
	}
	_ = w.Close()
	return e.do("POST", "/requests", token, &buf, w.FormDataContentType())
}

func id(n int64) *big.Int { return big.NewInt(n) }

// ---------------------------------------------------------------- sign-in

func TestSignIn(t *testing.T) {
	e := newEnv(t)

	nonce := e.get("/auth/nonce?address="+e.alice.Addr.Hex(), "").json(t)
	message := nonce["message"].(string)
	if !strings.Contains(message, "localhost:3000 wants you to sign in with your Ethereum account:\n"+e.alice.Addr.Hex()) ||
		!strings.Contains(message, "Chain ID: 1337") {
		t.Fatalf("unexpected message:\n%s", message)
	}

	// Someone else's signature over alice's message is rejected, and the nonce is then spent.
	bad := e.post("/auth/verify", "", map[string]string{"address": e.alice.Addr.Hex(), "nonce": nonce["nonce"].(string), "signature": personalSign(t, e.bob, message)})
	expect(t, bad, 401)
	retry := e.post("/auth/verify", "", map[string]string{"address": e.alice.Addr.Hex(), "nonce": nonce["nonce"].(string), "signature": personalSign(t, e.alice, message)})
	expect(t, retry, 401)

	// A nonce issued for alice cannot sign bob in.
	n2 := e.get("/auth/nonce?address="+e.alice.Addr.Hex(), "").json(t)
	other := e.post("/auth/verify", "", map[string]string{"address": e.bob.Addr.Hex(), "nonce": n2["nonce"].(string), "signature": personalSign(t, e.bob, n2["message"].(string))})
	expect(t, other, 401)

	token := e.login(e.alice)
	me := e.get("/members/me", token)
	expect(t, me, 200)
	if me.json(t)["address"] != chain.Addr(e.alice.Addr) {
		t.Fatalf("me = %s", me.body)
	}

	expect(t, e.get("/members/me", ""), 401)
	expect(t, e.get("/notifications", "not-a-token"), 401)
	expect(t, e.get("/auth/nonce?address=nope", ""), 400)

	expect(t, e.do("POST", "/auth/logout", token, nil, ""), 204)
	expect(t, e.get("/members/me", token), 401)
}

// ---------------------------------------------------------------- members

func TestMembers(t *testing.T) {
	e := newEnv(t)
	alice := e.get("/members/"+e.alice.Addr.Hex(), "").json(t)
	state := alice["chain"].(map[string]any)
	if state["registered"] != true || state["ready"] != true || state["balance"] != testutil.Ether(100).String() {
		t.Fatalf("alice chain state = %v", state)
	}
	if alice["profile"] == nil {
		t.Fatal("alice is indexed, profile expected")
	}

	stranger := common.HexToAddress("0x000000000000000000000000000000000000dEaD")
	s := e.get("/members/"+stranger.Hex(), "").json(t)
	if s["profile"] != nil || s["chain"].(map[string]any)["registered"] != false {
		t.Fatalf("stranger = %v", s)
	}

	token := e.login(e.alice)
	b, _ := json.Marshal(map[string]any{"displayName": "  Alice  "})
	r := e.do("PUT", "/members/me", token, bytes.NewReader(b), "application/json")
	expect(t, r, 200)
	if r.json(t)["displayName"] != "Alice" {
		t.Fatalf("displayName = %s", r.body)
	}
	put := func(token string, v any) response {
		b, _ := json.Marshal(v)
		return e.do("PUT", "/members/me", token, bytes.NewReader(b), "application/json")
	}
	full := put(token, map[string]any{"displayName": "Alice Liddell", "nickname": "Al", "birthDate": "1990-05-17", "city": " Bandung "})
	expect(t, full, 200)
	if p := full.json(t); p["nickname"] != "Al" || p["birthDate"] != "1990-05-17" || p["city"] != "Bandung" {
		t.Fatalf("profile = %s", full.body)
	}
	expect(t, put(token, map[string]any{"birthDate": "17-05-1990"}), 400)
	expect(t, put(token, map[string]any{"birthDate": "2999-01-01"}), 400)
	expect(t, put(token, map[string]any{"nickname": strings.Repeat("x", 31)}), 400)

	// The birth date is only for alice; the city only for signed-in viewers.
	bobToken := e.login(e.bob)
	if p := e.get("/members/me", token).json(t)["profile"].(map[string]any); p["birthDate"] != "1990-05-17" {
		t.Fatalf("own profile = %v", p)
	}
	if p := e.get("/members/"+e.alice.Addr.Hex(), bobToken).json(t)["profile"].(map[string]any); p["birthDate"] != nil || p["city"] != "Bandung" {
		t.Fatalf("bob's view = %v", p)
	}
	if p := e.get("/members/"+e.alice.Addr.Hex(), "").json(t)["profile"].(map[string]any); p["birthDate"] != nil || p["city"] != nil || p["nickname"] != "Al" {
		t.Fatalf("anonymous view = %v", p)
	}

	// Replacing the profile clears what is left out.
	if p := put(token, map[string]any{"displayName": "Alice"}).json(t); p["nickname"] != nil || p["city"] != nil || p["birthDate"] != nil {
		t.Fatalf("after replace = %v", p)
	}

	long, _ := json.Marshal(map[string]any{"displayName": strings.Repeat("x", 51)})
	expect(t, e.do("PUT", "/members/me", token, bytes.NewReader(long), "application/json"), 400)
	unknown, _ := json.Marshal(map[string]any{"ready": true})
	expect(t, e.do("PUT", "/members/me", token, bytes.NewReader(unknown), "application/json"), 400)

	// An address that never registered cannot have a profile.
	strangerAccount := e.chain.Accounts[5]
	strangerToken := e.login(strangerAccount)
	expect(t, e.do("PUT", "/members/me", strangerToken, bytes.NewReader(b), "application/json"), 409)
}

func (e *env) uploadPhoto(token string, file []byte) response {
	e.t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, _ := w.CreateFormFile("file", "me.png")
	_, _ = fw.Write(file)
	_ = w.Close()
	return e.do("PUT", "/members/me/photo", token, &buf, w.FormDataContentType())
}

func TestPhoto(t *testing.T) {
	e := newEnv(t)
	aliceToken, bobToken := e.login(e.alice), e.login(e.bob)
	png := append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 100)...)
	path := "/members/" + e.alice.Addr.Hex() + "/photo"

	expect(t, e.get(path, bobToken), 404)
	set := e.uploadPhoto(aliceToken, png)
	expect(t, set, 200)
	sum := sha256.Sum256(png)
	if set.json(t)["photo"] != "0x"+hex.EncodeToString(sum[:]) {
		t.Fatalf("photo = %s", set.body)
	}

	got := e.get(path, bobToken)
	expect(t, got, 200)
	if !bytes.Equal(got.body, png) || got.header.Get("Content-Type") != "image/png" {
		t.Fatalf("photo served as %q", got.header.Get("Content-Type"))
	}
	expect(t, e.get(path, ""), 401) // members only

	expect(t, e.uploadPhoto(aliceToken, pdf), 415)
	expect(t, e.uploadPhoto(aliceToken, append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 64<<10)...)), 413)
	expect(t, e.uploadPhoto(e.login(e.chain.Accounts[5]), png), 409) // never registered

	del := e.do("DELETE", "/members/me/photo", aliceToken, nil, "")
	expect(t, del, 200)
	if del.json(t)["photo"] != nil {
		t.Fatalf("after delete = %s", del.body)
	}
	expect(t, e.get(path, bobToken), 404)
}

func TestStats(t *testing.T) {
	e := newEnv(t)
	e.chain.Send(e.chain.Escrow.OpenRequest(e.alice.Opts, testutil.Ether(90), 3600, [32]byte{1}, id(0)))
	e.sync()
	st := e.get("/stats", "")
	expect(t, st, 200)
	got := st.json(t)
	if got["members"] != float64(5) || got["readyMembers"] != float64(4) || got["requests"] != float64(1) ||
		got["funded"] != float64(0) || got["distributed"] != "0" {
		t.Fatalf("stats = %s", st.body)
	}
}

// ---------------------------------------------------------------- requests, evidence, responses

func TestRequestFlow(t *testing.T) {
	e := newEnv(t)
	aliceToken, bobToken, eveToken := e.login(e.alice), e.login(e.bob), e.login(e.eve)

	// Upload the draft; the hash is the SHA-256 of the document.
	up := e.upload(aliceToken, "Surgery", "Appendix surgery bill", pdf)
	expect(t, up, 201)
	sum := sha256.Sum256(pdf)
	hash := up.json(t)["evidenceHash"].(string)
	if hash != "0x"+hex.EncodeToString(sum[:]) {
		t.Fatalf("evidenceHash %s", hash)
	}
	expect(t, e.upload(aliceToken, "", "x", pdf), 400)
	expect(t, e.upload(aliceToken, "t", "d", nil), 400)
	expect(t, e.upload(aliceToken, "t", "d", []byte("<html></html>")), 415)
	expect(t, e.upload(aliceToken, "t", "d", append([]byte("%PDF-1.7\n"), make([]byte, 1<<20)...)), 413)

	// The wallet opens the request with that hash; the indexer links the draft.
	e.chain.Send(e.chain.Escrow.OpenRequest(e.alice.Opts, testutil.Ether(90), 3600, common.HexToHash(hash), id(0)))
	e.sync()

	r := e.get("/requests/1", bobToken)
	expect(t, r, 200)
	body := r.json(t)
	req := body["request"].(map[string]any)
	if req["title"] != "Surgery" || req["status"] != "open" || req["hasEvidence"] != true || req["share"] != testutil.Ether(30).String() {
		t.Fatalf("request = %v", req)
	}
	if you := body["you"].(map[string]any); you["inSnapshot"] != true || you["response"] != "pending" {
		t.Fatalf("bob's view = %v", you)
	}
	expect(t, e.get("/requests/99", bobToken), 404)
	expect(t, e.get("/requests/abc", bobToken), 400)
	// Request stories are health-related: members only.
	expect(t, e.get("/requests/1", ""), 401)
	expect(t, e.get("/requests", ""), 401)

	// Evidence: requester and snapshot members only.
	doc := e.get("/requests/1/evidence", bobToken)
	expect(t, doc, 200)
	if !bytes.Equal(doc.body, pdf) || doc.header.Get("Content-Type") != "application/pdf" ||
		doc.header.Get("X-Evidence-Sha256") != hash || !strings.Contains(doc.header.Get("Cache-Control"), "no-store") {
		t.Fatalf("evidence download: %v", doc.header)
	}
	expect(t, e.get("/requests/1/evidence", aliceToken), 200)
	expect(t, e.get("/requests/1/evidence", eveToken), 403)
	expect(t, e.get("/requests/1/evidence", ""), 401)

	// Responses: snapshot members say participate / decline, until they contribute.
	expect(t, e.post("/requests/1/contribute", bobToken, map[string]string{"response": "decline"}), 200)
	expect(t, e.post("/requests/1/contribute", bobToken, map[string]string{"response": "participate"}), 200)
	expect(t, e.post("/requests/1/contribute", bobToken, map[string]string{"response": "maybe"}), 400)
	expect(t, e.post("/requests/1/contribute", eveToken, map[string]string{"response": "participate"}), 403)
	expect(t, e.post("/requests/1/contribute", aliceToken, map[string]string{"response": "participate"}), 403)

	e.chain.Send(e.chain.Escrow.Contribute(e.bob.Opts, id(1)))
	e.sync()
	expect(t, e.post("/requests/1/contribute", bobToken, map[string]string{"response": "decline"}), 409)

	detail := e.get("/requests/1", bobToken).json(t)
	if detail["responses"].(map[string]any)["contributed"] != float64(1) {
		t.Fatalf("responses = %v", detail["responses"])
	}
	if detail["request"].(map[string]any)["status"] != "funding" {
		t.Fatalf("status = %v", detail["request"])
	}

	list := e.get("/requests?member=me", bobToken).json(t)["requests"].([]any)
	if len(list) != 1 {
		t.Fatalf("bob's requests = %v", list)
	}
	if got := list[0].(map[string]any)["yourResponse"]; got != "contributed" {
		t.Fatalf("yourResponse = %v, want contributed", got)
	}
	if all := e.get("/requests", bobToken).json(t)["requests"].([]any); all[0].(map[string]any)["yourResponse"] != nil {
		t.Fatal("yourResponse is only filled for member=me")
	}
	if got := e.get("/requests?member=me", eveToken).json(t)["requests"].([]any); len(got) != 0 {
		t.Fatalf("eve is in no snapshot, got %v", got)
	}
	expect(t, e.get("/requests?member=me", ""), 401)

	// Unregistered addresses cannot upload drafts.
	expect(t, e.upload(e.login(e.chain.Accounts[5]), "t", "d", pdf), 403)
}

// ---------------------------------------------------------------- proof and refunds

func TestProofAndRefunds(t *testing.T) {
	e := newEnv(t)
	aliceToken, daveToken := e.login(e.alice), e.login(e.dave)

	// First request: no proof needed.
	p := e.get("/members/me/proof", aliceToken).json(t)
	if p["needed"] != false || p["proofId"] != "0" || p["canOpenRequest"] != true {
		t.Fatalf("first proof = %v", p)
	}
	e.chain.Send(e.chain.Escrow.OpenRequest(e.alice.Opts, testutil.Ether(90), 3600, [32]byte{1}, id(0)))
	e.chain.Send(e.chain.Escrow.OpenRequest(e.bob.Opts, testutil.Ether(90), 3600, [32]byte{2}, id(0)))
	e.chain.Send(e.chain.Escrow.Contribute(e.alice.Opts, id(2)))
	e.chain.Send(e.chain.Escrow.Contribute(e.dave.Opts, id(2)))
	e.sync()

	// alice's own request is still open, so even a valid proof cannot open another yet.
	p = e.get("/members/me/proof", aliceToken).json(t)
	if p["needed"] != true || p["canOpenRequest"] != false {
		t.Fatalf("proof while open = %v", p)
	}

	// bob cancels request 2: its contributions stop counting as proof, refunds become claimable.
	e.chain.Send(e.chain.Escrow.CancelRequest(e.bob.Opts, id(2)))
	e.sync()
	refunds := e.get("/members/me/refunds", daveToken).json(t)
	if refunds["total"] != testutil.Ether(30).String() || len(refunds["refunds"].([]any)) != 1 {
		t.Fatalf("dave's refunds = %v", refunds)
	}
	e.chain.Send(e.chain.Escrow.ClaimRefund(e.dave.Opts, id(2)))
	e.sync()
	if refunds := e.get("/members/me/refunds", daveToken).json(t); refunds["total"] != "0" {
		t.Fatalf("after claim = %v", refunds)
	}

	// After its deadline alice needs a proof, and the cancelled contribution is not one.
	e.chain.Warp(2 * time.Hour)
	e.chain.Mine(1)
	p = e.get("/members/me/proof", aliceToken).json(t)
	if p["proofId"] != nil {
		t.Fatalf("a contribution to a cancelled request must not be offered as proof: %v", p)
	}

	// A fresh contribution is.
	e.chain.Send(e.chain.Escrow.OpenRequest(e.carol.Opts, testutil.Ether(90), 3600, [32]byte{3}, id(0)))
	e.chain.Send(e.chain.Escrow.Contribute(e.alice.Opts, id(3)))
	e.sync()
	p = e.get("/members/me/proof", aliceToken).json(t)
	if p["proofId"] != "3" || p["canOpenRequest"] != true {
		t.Fatalf("proof = %v", p)
	}
}

// ---------------------------------------------------------------- notifications

func TestNotifications(t *testing.T) {
	e := newEnv(t)
	bobToken, carolToken := e.login(e.bob), e.login(e.carol)

	// bob listens live.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	ws, _, err := websocket.Dial(ctx, strings.Replace(e.srv.URL, "http", "ws", 1)+"/ws?token="+bobToken, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer ws.CloseNow()
	time.Sleep(200 * time.Millisecond) // let the subscription register

	e.chain.Send(e.chain.Escrow.OpenRequest(e.alice.Opts, testutil.Ether(90), 3600, [32]byte{1}, id(0)))
	e.sync()

	var pushed map[string]any
	if err := wsjson.Read(ctx, ws, &pushed); err != nil {
		t.Fatalf("no live notification: %v", err)
	}
	if pushed["type"] != "request_opened" || pushed["requestId"] != float64(1) {
		t.Fatalf("pushed = %v", pushed)
	}

	list := e.get("/notifications?unread=true", bobToken).json(t)["notifications"].([]any)
	if len(list) != 1 {
		t.Fatalf("bob's notifications = %v", list)
	}
	nid := int64(list[0].(map[string]any)["id"].(float64))
	path := "/notifications/" + big.NewInt(nid).String() + "/read"
	expect(t, e.post(path, carolToken, nil), 404) // not carol's
	expect(t, e.post(path, bobToken, nil), 204)
	if left := e.get("/notifications?unread=true", bobToken).json(t)["notifications"].([]any); len(left) != 0 {
		t.Fatalf("still unread: %v", left)
	}

	// The WebSocket needs a valid session.
	if _, _, err := websocket.Dial(ctx, strings.Replace(e.srv.URL, "http", "ws", 1)+"/ws?token=bad", nil); err == nil {
		t.Fatal("WebSocket without a valid token must be refused")
	}
}

func TestCORS(t *testing.T) {
	e := newEnv(t)
	req, _ := http.NewRequest("OPTIONS", e.srv.URL+"/requests", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 204 || res.Header.Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Fatalf("preflight: %d %v", res.StatusCode, res.Header)
	}
	req.Header.Set("Origin", "https://evil.example")
	res, _ = http.DefaultClient.Do(req)
	res.Body.Close()
	if res.Header.Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("unknown origins must not be allowed")
	}
}

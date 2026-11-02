// End-to-end user flow against a running backend and a local Hardhat node.
// Started by ../backend/scripts/e2e.sh, which deploys the contracts and runs `whitzard all`.
//
//   API_URL=… TOKEN_ADDRESS=… REGISTRY_ADDRESS=… ESCROW_ADDRESS=… \
//     pnpm hardhat run scripts/e2e-flow.ts --network localhost
//
// Throws (non-zero exit) on the first check that fails.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { network } from "hardhat";
import { getAddress, parseEther, parseSignature } from "viem";

const API = process.env.API_URL ?? "http://127.0.0.1:18080";
const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is required`);
  return getAddress(v);
};

const { viem, provider } = await network.create();
const publicClient = await viem.getPublicClient();
const [, alice, bob, carol, dave, stranger] = await viem.getWalletClients();
const token = await viem.getContractAt("WhitzardToken", env("TOKEN_ADDRESS"));
const registry = await viem.getContractAt("Registry", env("REGISTRY_ADDRESS"));
const escrow = await viem.getContractAt("Escrow", env("ESCROW_ADDRESS"));
type Wallet = typeof alice;

const step = (s: string) => console.log(`\n▶ ${s}`);
const ok = (s: string) => console.log(`  ✓ ${s}`);

async function api(path: string, opts: { token?: string; method?: string; body?: unknown; form?: FormData } = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: FormData | string | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(API + path, { method: opts.method ?? (body ? "POST" : "GET"), headers, body });
  const text = await res.text();
  let json: any = undefined;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

async function until<T>(what: string, fn: () => Promise<T | undefined | false>, timeoutMs = 30_000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for: ${what}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

async function send(hash: Promise<`0x${string}`>) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: await hash });
  assert.equal(receipt.status, "success");
  return receipt;
}

async function login(wallet: Wallet): Promise<string> {
  const address = wallet.account.address;
  const nonce = await api(`/auth/nonce?address=${address}`);
  assert.equal(nonce.status, 200, nonce.text);
  const signature = await wallet.signMessage({ account: wallet.account, message: nonce.json.message });
  const verify = await api("/auth/verify", { body: { address, nonce: nonce.json.nonce, signature } });
  assert.equal(verify.status, 200, verify.text);
  return verify.json.token;
}

async function permitContribute(wallet: Wallet, id: bigint) {
  const owner = wallet.account.address;
  const { share } = await escrow.read.getRequest([id]);
  const deadline = BigInt((await publicClient.getBlock()).timestamp) + 3600n;
  const signature = await wallet.signTypedData({
    account: wallet.account,
    domain: { name: await token.read.name(), version: "1", chainId: await publicClient.getChainId(), verifyingContract: token.address },
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    message: { owner, spender: escrow.address, value: share, nonce: await token.read.nonces([owner]), deadline },
  });
  const { v, r, s } = parseSignature(signature);
  await send(escrow.write.contributeWithPermit([id, deadline, Number(v), r, s], { account: wallet.account }));
}

const timeTravel = async (seconds: number) => {
  await provider.request({ method: "evm_increaseTime", params: [seconds] });
  await provider.request({ method: "evm_mine", params: [] });
};

// ------------------------------------------------------------------ flow

step("members get tokens, register and turn Ready on");
for (const w of [alice, bob, carol, dave]) {
  await send(token.write.faucet({ account: w.account }));
  await send(registry.write.register({ account: w.account }));
  await send(registry.write.setReady([true], { account: w.account }));
}
await provider.request({ method: "evm_mine", params: [] });
ok("4 members Ready");

step("everyone signs in with their wallet (SIWE)");
const [aliceT, bobT, carolT, strangerT] = await Promise.all([alice, bob, carol, stranger].map(login));
ok("4 sessions");
const me = await api("/members/me", { token: aliceT });
assert.equal(me.json.chain.registered, true);
assert.equal(me.json.chain.ready, true);
ok(`alice: registered, Ready, balance ${me.json.chain.balance}`);
// The API reads membership from the indexed mirror, which may still be a block behind.
await until("the indexer to pick up the members", async () => {
  const list = await api("/members", { token: aliceT });
  return list.json.members.length === 4;
});

step("bob listens for live notifications");
const live: any[] = [];
const ws = new WebSocket(`${API.replace("http", "ws")}/ws?token=${bobT}`);
ws.onmessage = (m) => live.push(JSON.parse(String(m.data)));
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
ok("WebSocket open");

step("alice uploads the evidence and opens a request");
const document = new TextEncoder().encode("%PDF-1.7\nHospital bill: appendix surgery, total 90 WHZD\n");
const form = new FormData();
form.set("title", "Appendix surgery");
form.set("description", "Emergency appendectomy, hospital bill attached.");
form.set("file", new Blob([document], { type: "application/pdf" }), "bill.pdf");
const draft = await api("/requests", { token: aliceT, form });
assert.equal(draft.status, 201, draft.text);
const evidenceHash = draft.json.evidenceHash as `0x${string}`;
assert.equal(evidenceHash, `0x${createHash("sha256").update(document).digest("hex")}`);
ok(`draft stored, evidenceHash = SHA-256 of the document`);

const proof = await api("/members/me/proof", { token: aliceT });
assert.equal(proof.json.needed, false);
await send(escrow.write.openRequest([parseEther("90"), 600n, evidenceHash, BigInt(proof.json.proofId)], { account: alice.account }));
const id = await escrow.read.requestCount();
const request = await until("the indexer to pick up the request", async () => {
  const r = await api(`/requests/${id}`, { token: bobT });
  return r.status === 200 && r.json;
});
assert.equal(request.request.title, "Appendix surgery");
assert.equal(request.request.snapshotSize, 3);
assert.equal(request.you.inSnapshot, true);
ok(`request #${id}: snapshot of 3, share ${request.request.share}, draft linked`);

const pushed = await until("bob's live notification", async () => live.find((n) => n.type === "request_opened"));
assert.equal(pushed.requestId, Number(id));
ok(`live push: "${pushed.title}"`);

step("evidence is visible to snapshot members only");
const doc = await api(`/requests/${id}/evidence`, { token: bobT });
assert.equal(doc.status, 200);
assert.equal(doc.headers.get("x-evidence-sha256"), evidenceHash);
assert.equal((await api(`/requests/${id}/evidence`, { token: strangerT })).status, 403);
ok("bob can read it (hash matches the chain), a stranger gets 403");

step("members respond and contribute");
assert.equal((await api(`/requests/${id}/contribute`, { token: carolT, body: { response: "decline" } })).status, 200);
assert.equal((await api(`/requests/${id}/contribute`, { token: bobT, body: { response: "participate" } })).status, 200);
await permitContribute(bob, id);
await send(token.write.approve([escrow.address, parseEther("30")], { account: dave.account }));
await send(escrow.write.contribute([id], { account: dave.account }));
const funded = await until("both contributions indexed", async () => {
  const r = await api(`/requests/${id}`, { token: aliceT });
  return r.json.request.collected === parseEther("60").toString() && r.json;
});
assert.deepEqual(funded.responses, { pending: 0, participating: 0, declined: 1, contributed: 2 });
ok("bob (permit, 1 tx) and dave contributed 30 each; carol declined");

step("the deadline passes; the keeper finalizes");
const before = await token.read.balanceOf([alice.account.address]);
await timeTravel(601);
const finalized = await until("the keeper to finalize", async () => {
  const r = await api(`/requests/${id}`, { token: aliceT });
  return r.json.request.status === "finalized" && r.json;
}, 60_000);
assert.ok(finalized.request.finalizedTx);
assert.equal((await token.read.balanceOf([alice.account.address])) - before, parseEther("60"));
const aliceNotes = await api("/notifications", { token: aliceT });
assert.ok(aliceNotes.json.notifications.some((n: any) => n.type === "request_finalized"));
ok("alice received exactly 60 WHZD (partial funding is still paid out) and was notified");

step("a cancelled request: contributors claim their refund");
await send(escrow.write.openRequest([parseEther("30"), 600n, `0x${"11".repeat(32)}`, 0n], { account: bob.account }));
const cancelId = await escrow.read.requestCount();
await until("the second request", async () => (await api(`/requests/${cancelId}`, { token: bobT })).status === 200);
await send(token.write.approve([escrow.address, parseEther("10")], { account: carol.account }));
await send(escrow.write.contribute([cancelId], { account: carol.account }));
await send(escrow.write.cancelRequest([cancelId], { account: bob.account }));
const refunds = await until("the refund to show up", async () => {
  const r = await api("/members/me/refunds", { token: carolT });
  return r.json.total !== "0" && r.json;
});
assert.equal(refunds.total, parseEther("10").toString());
await send(escrow.write.claimRefund([cancelId], { account: carol.account }));
await until("the refund to be indexed", async () => (await api("/members/me/refunds", { token: carolT })).json.total === "0");
ok("carol saw a 10 WHZD pending refund, claimed it, and it cleared");

ws.close();
console.log("\n✅ end-to-end flow passed");

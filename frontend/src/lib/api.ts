import type { Address, Hex } from "viem";

import { appConfig } from "@/lib/config";

// Shapes of the backend's JSON (see backend/README.md). Amounts are decimal strings in wei.

export type RequestStatus = "open" | "funding" | "finalized" | "expired" | "cancelled";
export type SnapshotResponse = "pending" | "participating" | "declined" | "contributed";

export type Request = {
  id: number;
  requester: Address;
  title: string | null;
  description: string | null;
  amount: string;
  share: string;
  collected: string;
  refundedTotal: string;
  contributors: number;
  snapshotBlock: number;
  snapshotSize: number;
  deadline: string;
  evidenceHash: Hex;
  hasEvidence: boolean;
  openedAt: string;
  openedTx: Hex;
  finalizedAt: string | null;
  finalizedTx: Hex | null;
  cancelledAt: string | null;
  cancelledTx: Hex | null;
  status: RequestStatus;
  awaitingFinalize: boolean;
  yourResponse?: SnapshotResponse;
};

export type Contribution = {
  requestId: number;
  amount: string;
  txHash: Hex;
  contributedAt: string;
  refunded: boolean;
  refundTxHash: Hex | null;
  refundedAt: string | null;
};

export type RequestDetail = {
  request: Request;
  responses: Record<SnapshotResponse, number>;
  you?: {
    isRequester: boolean;
    inSnapshot: boolean;
    response: SnapshotResponse | null;
    contribution: Contribution | null;
  };
};

/** Self-declared and never verified. */
export type MemberProfile = {
  address: Address;
  displayName: string | null;
  nickname: string | null;
  /** YYYY-MM-DD; only present on your own profile. */
  birthDate?: string | null;
  /** Only shown to signed-in viewers. */
  city: string | null;
  /** SHA-256 of the photo (also a cache key), or null. */
  photo: string | null;
  ready: boolean;
  registeredAtBlock: number;
  contributions: number;
  requests: number;
  createdAt: string;
};

export type Member = {
  address: Address;
  profile: MemberProfile | null;
  chain: {
    registered: boolean;
    ready: boolean;
    hasParticipated: boolean;
    requestCount: string;
    balance: string;
    faucetClaimed: string;
    faucetNextClaimAt: string;
  };
};

export type ProfileInput = {
  displayName: string | null;
  nickname: string | null;
  birthDate: string | null;
  city: string | null;
};

export type Stats = {
  members: number;
  readyMembers: number;
  requests: number;
  funded: number;
  distributed: string;
  contributions: number;
};

/** The signed-in member's own totals. Amounts are wei strings. */
export type MemberStats = {
  helped: number;
  given: string;
  refunded: string;
  requests: number;
  funded: number;
  received: string;
};

/** One on-chain member step on a request. Who declined or did not answer is only counted, never named. */
export type Activity = {
  type: "contributed" | "refunded";
  member: Address;
  amount: string;
  txHash: Hex;
  at: string;
};

export type Proof = { needed: boolean; proofId: string | null; canOpenRequest: boolean };
export type Refunds = { total: string; refunds: { requestId: string; amount: string }[] };

export type Notification = {
  id: number;
  type:
    | "request_opened"
    | "contribution_received"
    | "request_cancelled"
    | "request_finalized"
    | "request_forwarded"
    | "request_expired";
  /** Indonesian text from the backend; shown only when the client can't write its own (older rows). */
  title: string;
  description: string;
  requestId: number | null;
  /** Wei: the share asked for, the contribution received, or the total paid out. Null if none, or written before amounts were kept. */
  amount: string | null;
  isRead: boolean;
  createdAt: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(appConfig.apiUrl + path, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  // Without a message from the backend, errorMessage() says it in the member's language.
  if (!res.ok) throw new ApiError(res.status, body.error ?? "");
  return body as T;
}

export const api = {
  nonce: (address: Address) => call<{ nonce: string; message: string; expiresAt: string }>(`/auth/nonce?address=${address}`),
  verify: (address: Address, nonce: string, signature: Hex) =>
    call<{ token: string; address: Address; expiresAt: string }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ address, nonce, signature }),
    }),
  logout: (token: string) => call<void>("/auth/logout", { method: "POST", token }),

  member: (address: Address | "me", token?: string | null) => call<Member>(`/members/${address}`, { token }),
  members: (token: string) => call<{ members: MemberProfile[] }>("/members", { token }),
  updateMe: (token: string, profile: ProfileInput) =>
    call<MemberProfile>("/members/me", { method: "PUT", token, body: JSON.stringify(profile) }),
  setPhoto: (token: string, file: File) => {
    const form = new FormData();
    form.set("file", file);
    return call<MemberProfile>("/members/me/photo", { method: "PUT", token, body: form });
  },
  deletePhoto: (token: string) => call<MemberProfile>("/members/me/photo", { method: "DELETE", token }),
  /** `hash` versions the URL: the backend lets browsers cache a photo for a day. */
  photo: async (token: string, address: Address, hash: string) => {
    const res = await fetch(`${appConfig.apiUrl}/members/${address}/photo?v=${hash}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new ApiError(res.status, "");
    return res.blob();
  },
  stats: () => call<Stats>("/stats"),
  proof: (token: string) => call<Proof>("/members/me/proof", { token }),
  refunds: (token: string) => call<Refunds>("/members/me/refunds", { token }),
  memberStats: (token: string) => call<MemberStats>("/members/me/stats", { token }),

  requests: (query: { requester?: Address; member?: "me"; limit?: number }, token?: string | null) => {
    const params = new URLSearchParams();
    if (query.requester) params.set("requester", query.requester);
    if (query.member) params.set("member", query.member);
    if (query.limit) params.set("limit", String(query.limit));
    return call<{ requests: Request[] }>(`/requests?${params}`, { token });
  },
  request: (id: number, token?: string | null) => call<RequestDetail>(`/requests/${id}`, { token }),
  activity: (id: number, token: string) =>
    call<{ activity: Activity[] }>(`/requests/${id}/activity`, { token }),
  createDraft: (token: string, form: FormData) =>
    call<{ draftId: number; evidenceHash: Hex; contentType: string; size: number }>("/requests", {
      method: "POST",
      token,
      body: form,
    }),
  respond: (token: string, id: number, response: "participate" | "decline") =>
    call<{ response: SnapshotResponse }>(`/requests/${id}/contribute`, {
      method: "POST",
      token,
      body: JSON.stringify({ response }),
    }),
  evidence: async (token: string, id: number) => {
    const res = await fetch(`${appConfig.apiUrl}/requests/${id}/evidence`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error ?? "");
    }
    return { blob: await res.blob(), hash: res.headers.get("X-Evidence-Sha256") };
  },

  notifications: (token: string, opts: { unread?: boolean; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.unread) params.set("unread", "true");
    if (opts.limit) params.set("limit", String(opts.limit));
    return call<{ notifications: Notification[] }>(`/notifications?${params}`, { token });
  },
  markRead: (token: string, id: number) => call<void>(`/notifications/${id}/read`, { method: "POST", token }),
};

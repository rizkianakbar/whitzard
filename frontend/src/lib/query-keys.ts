// Query keys, so mutations and live notifications can refresh the right data. Anything that
// depends on who is asking also carries the viewer's address (see `viewer`), so switching
// wallets never shows the previous wallet's cached data.
export const keys = {
  /** Every member's data, to refresh all of it at once. */
  anyMember: ["member"] as const,
  member: (address: string) => ["member", address.toLowerCase()] as const,
  members: ["members"] as const,
  // Under the member's key, so anything that refreshes the member refreshes their totals too.
  memberStats: (address: string) => ["member", address.toLowerCase(), "stats"] as const,
  requests: ["requests"] as const,
  request: (id: number) => ["request", id] as const,
  notifications: ["notifications"] as const,
  refunds: ["refunds"] as const,
  proof: ["proof"] as const,
  stats: ["stats"] as const,
  /** A photo is immutable per hash, so the hash is part of the key. */
  photo: (address: string, hash: string) => ["photo", address.toLowerCase(), hash] as const,
};

export const viewer = (address: string | undefined, token: string | null) =>
  token && address ? address.toLowerCase() : "anon";

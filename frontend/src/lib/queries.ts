"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";

import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

// Query keys, so mutations and live notifications can refresh the right data. Anything that
// depends on who is asking also carries the viewer's address (see `viewer`), so switching
// wallets never shows the previous wallet's cached data.
export const keys = {
  member: (address: string) => ["member", address.toLowerCase()] as const,
  members: ["members"] as const,
  // Under the member's key, so anything that refreshes the member refreshes their totals too.
  memberStats: (address: string) => ["member", address.toLowerCase(), "stats"] as const,
  requests: (scope: string) => ["requests", scope] as const,
  request: (id: number) => ["request", id] as const,
  notifications: ["notifications"] as const,
  refunds: ["refunds"] as const,
  proof: ["proof"] as const,
  stats: ["stats"] as const,
};

export function useMe() {
  const { address, token } = useSession();
  return useQuery({
    queryKey: keys.member(address ?? "none"),
    queryFn: () => api.member(address!, token),
    enabled: !!address,
  });
}

export function useRequests(scope: "all" | "mine" | "for-me") {
  const { address, token } = useSession();
  return useQuery({
    queryKey: [...keys.requests(scope), viewer(address, token)],
    queryFn: async () =>
      (
        await api.requests(
          scope === "mine" ? { requester: address } : scope === "for-me" ? { member: "me" } : {},
          token,
        )
      ).requests,
    enabled: !!token,
  });
}

const viewer = (address: string | undefined, token: string | null) => (token && address ? address.toLowerCase() : "anon");

export function useRequest(id: number) {
  const { address, token } = useSession();
  return useQuery({
    queryKey: [...keys.request(id), viewer(address, token)],
    queryFn: () => api.request(id, token),
    enabled: !!token,
  });
}

/** Under the request's key, so every refresh of the request refreshes its activity too. */
export function useActivity(id: number) {
  const { address, token } = useSession();
  return useQuery({
    queryKey: [...keys.request(id), "activity", viewer(address, token)],
    queryFn: () => api.activity(id, token!),
    enabled: !!token,
  });
}

export function useMemberStats() {
  const { address, token } = useSession();
  return useQuery({
    queryKey: keys.memberStats(address ?? "none"),
    queryFn: () => api.memberStats(token!),
    enabled: !!token && !!address,
  });
}

export function useNotifications(limit = 50) {
  const { address, token } = useSession();
  return useQuery({
    queryKey: [...keys.notifications, viewer(address, token), limit],
    queryFn: async () => (await api.notifications(token!, { limit })).notifications,
    enabled: !!token,
  });
}

export function useRefunds() {
  const { address, token } = useSession();
  return useQuery({ queryKey: [...keys.refunds, viewer(address, token)], queryFn: () => api.refunds(token!), enabled: !!token });
}

export function useProof() {
  const { address, token } = useSession();
  return useQuery({ queryKey: [...keys.proof, viewer(address, token)], queryFn: () => api.proof(token!), enabled: !!token });
}

/**
 * Whether the member can open a request now, and if not, why: their own request is still running,
 * or (after the first request) they have to help someone else first. undefined while loading.
 */
export type Eligibility =
  | { can: true }
  | { can: false; reason: "running"; requestId: number }
  | { can: false; reason: "help-first" };

export function useEligibility(): Eligibility | undefined {
  const { data: proof } = useProof();
  const { data: mine } = useRequests("mine");
  if (!proof || !mine) return undefined;
  if (proof.canOpenRequest) return { can: true };
  const running = mine.find((r) => r.status === "open" || r.status === "funding");
  return running ? { can: false, reason: "running", requestId: running.id } : { can: false, reason: "help-first" };
}

export function useMember(address: Address | undefined) {
  const { token } = useSession();
  return useQuery({
    queryKey: keys.member(address ?? "none"),
    queryFn: () => api.member(address!, token),
    enabled: !!address,
  });
}

/** Every registered member's profile, ready ones first. */
export function useMembers() {
  const { address, token } = useSession();
  return useQuery({
    queryKey: [...keys.members, viewer(address, token)],
    queryFn: async () => (await api.members(token!)).members,
    enabled: !!token,
  });
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: api.stats });
}

/**
 * An object URL for a member's photo (photos need a session, so <img src> can't fetch them
 * directly). Keyed by the photo's hash, so each version is fetched once per page load.
 */
export function usePhotoUrl(address: Address | undefined, photo: string | null | undefined) {
  const { token } = useSession();
  const { data: url } = useQuery({
    queryKey: ["photo", address?.toLowerCase(), photo],
    queryFn: async () => URL.createObjectURL(await api.photo(token!, address!, photo!)),
    enabled: !!token && !!address && !!photo,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return photo ? (url ?? null) : null;
}

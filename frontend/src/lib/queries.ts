"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

// Query keys, so mutations and live notifications can refresh the right data. Anything that
// depends on who is asking also carries the viewer's address (see `viewer`), so switching
// wallets never shows the previous wallet's cached data.
export const keys = {
  member: (address: string) => ["member", address.toLowerCase()] as const,
  requests: (scope: string) => ["requests", scope] as const,
  request: (id: number) => ["request", id] as const,
  notifications: ["notifications"] as const,
  refunds: ["refunds"] as const,
  proof: ["proof"] as const,
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
    enabled: scope === "all" || !!token,
  });
}

const viewer = (address: string | undefined, token: string | null) => (token && address ? address.toLowerCase() : "anon");

export function useRequest(id: number) {
  const { address, token } = useSession();
  return useQuery({ queryKey: [...keys.request(id), viewer(address, token)], queryFn: () => api.request(id, token) });
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

"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { toast } from "sonner";

import { useProof } from "@/features/members/members.hooks";
import { HOUR, isOpen } from "@/features/requests/requests.lib";
import { useSession } from "@/features/session/session.hooks";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import { keys, viewer } from "@/lib/query-keys";

export type RequestScope = "all" | "mine" | "for-me";

// Query definitions, shared by the hooks below and by prefetching, so both use the same cache entry.

export const requestsQuery = (scope: RequestScope, address: Address | undefined, token: string | null) =>
  queryOptions({
    queryKey: [...keys.requests, scope, viewer(address, token)],
    queryFn: async () =>
      (await api.requests(scope === "mine" ? { requester: address } : scope === "for-me" ? { member: "me" } : {}, token)).requests,
    enabled: !!token,
  });

export const requestQuery = (id: number, address: Address | undefined, token: string | null) =>
  queryOptions({
    queryKey: [...keys.request(id), viewer(address, token)],
    queryFn: () => api.request(id, token),
    enabled: !!token,
  });

/** Under the request's key, so every refresh of the request refreshes its activity too. */
export const activityQuery = (id: number, address: Address | undefined, token: string | null) =>
  queryOptions({
    queryKey: [...keys.request(id), "activity", viewer(address, token)],
    queryFn: () => api.activity(id, token!),
    enabled: !!token,
  });

export function useRequests(scope: RequestScope) {
  const { address, token } = useSession();
  return useQuery(requestsQuery(scope, address, token));
}

/** `refetchInterval` keeps polling while the caller is mounted, e.g. while a payout is on its way. */
export function useRequest(id: number, refetchInterval?: number) {
  const { address, token } = useSession();
  return useQuery({ ...requestQuery(id, address, token), refetchInterval });
}

export function useActivity(id: number) {
  const { address, token } = useSession();
  return useQuery(activityQuery(id, address, token));
}

/**
 * Starts loading a request page the moment the member shows intent (hover, focus, touch), so the
 * page usually has its data by the time the click lands. Spread the result onto the link.
 */
export function usePrefetchRequest(id: number) {
  const { address, token } = useSession();
  const queryClient = useQueryClient();
  const prefetch = () => {
    if (!token) return;
    void queryClient.prefetchQuery(requestQuery(id, address, token));
    void queryClient.prefetchQuery(activityQuery(id, address, token));
  };
  return { onPointerEnter: prefetch, onFocus: prefetch, onTouchStart: prefetch };
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
  const running = mine.find(isOpen);
  return running ? { can: false, reason: "running", requestId: running.id } : { can: false, reason: "help-first" };
}

/**
 * "Not this time" on a request. The answer is recorded off-chain; refetching makes every view of
 * the request (and the share grid) show it right away. The toast comes from here, not mutate(),
 * because the button that sent it is often gone by then (the card moves on).
 */
export function useDecline(id: number, description?: string) {
  const { token } = useSession();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.respond(token!, id, "decline"),
    onSuccess: async () => {
      await Promise.all(
        [keys.request(id), keys.requests, keys.anyMember].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      toast(t.common.declinedToast, { description });
    },
  });
}

/**
 * Milliseconds until `deadline`, live. Ticks every second in the last hour (where minutes and
 * seconds matter), every 30 seconds before that. null on the server, where there is no clock.
 */
export function useRemaining(deadline: string): number | null {
  const end = Date.parse(deadline);
  const coarse = useNow();
  const now = useNow(coarse !== 0 && end - coarse < HOUR + 30_000 ? 1000 : 30_000);
  if (now === 0) return null;
  return Math.max(0, end - now);
}

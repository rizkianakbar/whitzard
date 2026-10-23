"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { notificationText } from "@/features/notifications/notifications.lib";
import { useSession } from "@/features/session/session.hooks";
import { api, type Notification } from "@/lib/api";
import { appConfig } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { keys, viewer } from "@/lib/query-keys";

export function useNotifications(limit = 50) {
  const { address, token } = useSession();
  return useQuery({
    queryKey: [...keys.notifications, viewer(address, token), limit],
    queryFn: async () => (await api.notifications(token!, { limit })).notifications,
    enabled: !!token,
  });
}

/** Marks notifications read and refreshes every list of them (the bell's and the full page's). */
export function useMarkRead() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Notification[]) => Promise.all(items.map((n) => api.markRead(token!, n.id))),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.notifications }),
  });
}

/** Keeps a WebSocket open while signed in: each new notification refreshes data and shows a toast. */
export function useLiveNotifications() {
  const { token, address } = useSession();
  const i18n = useI18n();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    let attempts = 0;
    const refresh = (queryKey: readonly unknown[]) => void queryClient.invalidateQueries({ queryKey });

    const connect = () => {
      socket = new WebSocket(`${appConfig.apiUrl.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(token)}`);
      socket.onopen = () => {
        attempts = 0;
      };
      socket.onmessage = (event) => {
        const n = JSON.parse(String(event.data)) as Notification;
        refresh(keys.notifications);
        refresh(keys.requests);
        refresh(keys.refunds);
        if (n.requestId) refresh(keys.request(n.requestId));
        if (address) refresh(keys.member(address));
        const { title, description } = notificationText(n, i18n);
        toast(title, { description });
      };
      socket.onclose = () => {
        if (closed) return;
        attempts += 1;
        retry = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempts));
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [token, address, queryClient, i18n]);
}

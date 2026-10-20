"use client";

import { type ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WagmiProvider } from "wagmi";

import { notificationText } from "@/components/notification-list";
import { Toaster } from "@/components/ui/sonner";
import type { Notification } from "@/lib/api";
import { appConfig } from "@/lib/config";
import { type Locale, LocaleProvider, useI18n } from "@/lib/i18n";
import { keys } from "@/lib/queries";
import { SessionProvider, useSession } from "@/lib/session";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1 } } }),
  );
  return (
    <LocaleProvider locale={locale}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <LiveNotifications />
            {children}
            {/* Below the sticky header, so toasts never cover the navigation. */}
            <Toaster theme="light" position="top-center" offset={84} mobileOffset={{ top: 80 }} />
          </SessionProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </LocaleProvider>
  );
}

/** Keeps a WebSocket open while signed in: each new notification refreshes data and shows a toast. */
function LiveNotifications() {
  const { token, address } = useSession();
  const i18n = useI18n();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    let attempts = 0;

    const connect = () => {
      socket = new WebSocket(`${appConfig.apiUrl.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(token)}`);
      socket.onopen = () => {
        attempts = 0;
      };
      socket.onmessage = (event) => {
        const n = JSON.parse(String(event.data)) as Notification;
        void queryClient.invalidateQueries({ queryKey: keys.notifications });
        void queryClient.invalidateQueries({ queryKey: ["requests"] });
        void queryClient.invalidateQueries({ queryKey: keys.refunds });
        if (n.requestId) void queryClient.invalidateQueries({ queryKey: keys.request(n.requestId) });
        if (address) void queryClient.invalidateQueries({ queryKey: keys.member(address) });
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

  return null;
}

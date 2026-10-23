"use client";

import { type ReactNode, useState } from "react";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { WagmiProvider } from "wagmi";

import { Toaster } from "@/components/ui/sonner";
import { useLiveNotifications } from "@/features/notifications/notifications.hooks";
import { SessionProvider } from "@/features/session/session";
import { errorMessage } from "@/lib/errors";
import { i18nFor, type Locale, LocaleProvider } from "@/lib/i18n";
import { wagmiConfig } from "@/lib/wagmi";

type ProvidersProps = {
  locale: Locale;
  children: ReactNode;
};

export function Providers(props: ProvidersProps) {
  const { locale, children } = props;
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
        // Every failed mutation (ours and wagmi's: connect, switch network) tells the member why, in
        // their language, so call sites don't each need a try/catch. A language switch reloads the
        // page, so the locale is fixed for this client's lifetime.
        mutationCache: new MutationCache({ onError: (error) => void toast.error(errorMessage(error, i18nFor(locale).t)) }),
      }),
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

// Its own component, so a notification re-renders only this (nothing), not the whole tree.
function LiveNotifications() {
  useLiveNotifications();
  return null;
}

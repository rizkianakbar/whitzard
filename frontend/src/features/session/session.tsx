"use client";

import { createContext, type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig, useConnection } from "wagmi";
import { disconnect, signMessage } from "wagmi/actions";
import type { Address, Hex } from "viem";

import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { dismissWalletPrompt, showWalletPrompt } from "@/features/tx/tx.lib";

type Stored = { token: string; expiresAt: string };

export type Session = {
  /** The connected wallet, if any. */
  address: Address | undefined;
  /** The backend session token for that wallet, if signed in. */
  token: string | null;
  /** "loading" until the wallet has reconnected and the stored session (if any) has been read in the browser. */
  status: "disconnected" | "loading" | "signed-out" | "signed-in";
  /** Signs in the connected wallet, or `account` when it was connected a moment ago and React hasn't caught up. */
  signIn: (account?: Address) => Promise<void>;
  /** Ends the backend session and disconnects the wallet. */
  signOut: () => Promise<void>;
};

export const SessionContext = createContext<Session | null>(null);
const key = (address: string) => `whitzard.session.${address.toLowerCase()}`;

function read(address: string): Stored | null {
  try {
    const stored = JSON.parse(localStorage.getItem(key(address)) ?? "null") as Stored | null;
    return stored && new Date(stored.expiresAt) > new Date() ? stored : null;
  } catch {
    return null;
  }
}

// Sessions live in localStorage; this store lets React read them and hear changes (this tab or others).
const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}
function write(address: string, value: Stored | null) {
  if (value) localStorage.setItem(key(address), JSON.stringify(value));
  else localStorage.removeItem(key(address));
  listeners.forEach((l) => l());
}

type SessionProviderProps = {
  children: ReactNode;
};

/** Sign-In with Ethereum against the backend, one session per connected wallet. */
export function SessionProvider(props: SessionProviderProps) {
  const { children } = props;
  const config = useConfig();
  const { t } = useI18n();
  const { address } = useConnection();
  // After a page load wagmi reconnects the stored wallet, from its provider's effect (which runs
  // after this one, so the subscription sees it). Until that finishes, "no address" doesn't mean
  // signed out, so pages must not redirect yet.
  const [reconnected, setReconnected] = useState(false);
  useEffect(
    () =>
      config.subscribe(
        (state) => state.status,
        (status) => {
          if (status !== "reconnecting" && status !== "connecting") setReconnected(true);
        },
      ),
    [config],
  );
  const settling = !reconnected && !address;
  const token = useSyncExternalStore(
    subscribe,
    () => (address ? (read(address)?.token ?? null) : null),
    () => undefined,
  );

  // A stored token may have been revoked or the backend reset. Rather than spend a request
  // checking it, the first query the backend rejects with 401 signs the wallet out.
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!address || !token) return;
    return queryClient.getQueryCache().subscribe((event) => {
      // Only the failure itself: a refetch of a query that failed before would still carry the old error.
      if (event.type !== "updated" || event.action.type !== "error") return;
      const { error } = event.action;
      if (error instanceof ApiError && error.status === 401) write(address, null);
    });
  }, [queryClient, address, token]);

  const status: Session["status"] = settling
    ? "loading"
    : !address
      ? "disconnected"
      : token === undefined
      ? "loading"
      : token
        ? "signed-in"
        : "signed-out";

  const signIn = async (account: Address | undefined = address) => {
    if (!account) throw new Error(t.errors.connectFirst);
    const { nonce, message } = await api.nonce(account);
    showWalletPrompt("wallet-sign-in", t.wallet.signIn);
    let signature: Hex;
    try {
      signature = await signMessage(config, { account, message });
    } finally {
      dismissWalletPrompt("wallet-sign-in");
    }
    const session = await api.verify(account, nonce, signature);
    write(account, { token: session.token, expiresAt: session.expiresAt });
  };

  const signOut = async () => {
    const current = address ? read(address) : null;
    if (address) write(address, null);
    await disconnect(config);
    if (current) await api.logout(current.token).catch(() => undefined);
  };

  return (
    <SessionContext.Provider value={{ address, token: token ?? null, status, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

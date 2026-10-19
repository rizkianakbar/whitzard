"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { useConfig, useConnection } from "wagmi";
import { disconnect, signMessage } from "wagmi/actions";
import type { Address } from "viem";

import { api, ApiError } from "@/lib/api";

type Stored = { token: string; expiresAt: string };

type Session = {
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

const SessionContext = createContext<Session | null>(null);
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

/** Sign-In with Ethereum against the backend, one session per connected wallet. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const config = useConfig();
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

  // A stored token may have been revoked or the backend reset: check it once per wallet.
  useEffect(() => {
    if (!address || !token) return;
    api.member("me", token).catch((error) => {
      if (error instanceof ApiError && error.status === 401) write(address, null);
    });
  }, [address, token]);

  const status: Session["status"] = settling
    ? "loading"
    : !address
      ? "disconnected"
      : token === undefined
      ? "loading"
      : token
        ? "signed-in"
        : "signed-out";

  const signIn = useCallback(
    async (account: Address | undefined = address) => {
      if (!account) throw new Error("Hubungkan dompet dulu.");
      const { nonce, message } = await api.nonce(account);
      const signature = await signMessage(config, { account, message });
      const session = await api.verify(account, nonce, signature);
      write(account, { token: session.token, expiresAt: session.expiresAt });
    },
    [address, config],
  );

  const signOut = useCallback(async () => {
    const current = address ? read(address) : null;
    if (address) write(address, null);
    await disconnect(config);
    if (current) await api.logout(current.token).catch(() => undefined);
  }, [address, config]);

  return (
    <SessionContext.Provider value={{ address, token: token ?? null, status, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <SessionProvider>");
  return session;
}

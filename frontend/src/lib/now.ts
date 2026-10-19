"use client";

import { useSyncExternalStore } from "react";

const DEFAULT_TICK = 30_000;
const stores = new Map<number, { subscribe: (onChange: () => void) => () => void; snapshot: () => number }>();

// One stable subscribe/snapshot pair per tick length, as useSyncExternalStore needs.
function store(tick: number) {
  let s = stores.get(tick);
  if (!s) {
    s = {
      subscribe: (onChange) => {
        const timer = setInterval(onChange, tick);
        return () => clearInterval(timer);
      },
      // Rounded so repeated reads within a tick return the same value.
      snapshot: () => Math.floor(Date.now() / tick) * tick,
    };
    stores.set(tick, s);
  }
  return s;
}

/** The current time, updated every `tick` ms (30 seconds by default). 0 on the server. */
export function useNow(tick = DEFAULT_TICK): number {
  const { subscribe, snapshot } = store(tick);
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}

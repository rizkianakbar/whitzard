"use client";

import { useSyncExternalStore } from "react";

const TICK = 30_000;
const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, TICK);
  return () => clearInterval(timer);
};
// Rounded so repeated reads within a tick return the same value, as useSyncExternalStore needs.
const snapshot = () => Math.floor(Date.now() / TICK) * TICK;

/** The current time, updated every 30 seconds (keeps countdowns live and renders pure). 0 on the server. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}

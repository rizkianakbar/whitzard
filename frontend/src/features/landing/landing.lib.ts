import type { CSSProperties } from "react";

export const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Per-element animation delay (--d), read by the landing animations in globals.css. */
export const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Entrance order (--i) of a .rise element within its revealed block. */
export const order = (i: number) => ({ "--i": i }) as CSSProperties;

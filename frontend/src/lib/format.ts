import { getAddress } from "viem";

// Amounts, dates and relative times depend on the language: see useI18n().fmt.

/** "0x7099…79C8", always in checksummed (EIP-55) case so the same address always looks the same. */
export function shortAddress(address: string): string {
  const a = /^0x[0-9a-fA-F]{40}$/.test(address) ? getAddress(address) : address;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Initials for an avatar ("Rina Puspita" → "RP"), or null when there is no name. */
export function initials(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

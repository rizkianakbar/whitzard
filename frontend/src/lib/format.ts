import { formatEther, getAddress } from "viem";

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 });
const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" });
const relative = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

/** "25", "12,5", "0,0001" WHZD from an amount in the smallest unit. */
export function formatWhzd(amount: string | bigint): string {
  return numberFormat.format(Number(formatEther(BigInt(amount))));
}

/** "0x7099…79C8", always in checksummed (EIP-55) case so the same address always looks the same. */
export function shortAddress(address: string): string {
  const a = /^0x[0-9a-fA-F]{40}$/.test(address) ? getAddress(address) : address;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function formatDate(value: string | Date): string {
  return dateFormat.format(new Date(value));
}

/** "3 jam lalu", "kemarin". */
export function timeAgo(value: string | Date, now: number): string {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "baru saja";
}

/** Time left until `deadline`: "2 hari 4 jam", "35 menit", or null once it has passed. */
export function timeLeft(deadline: string | Date, now: number): string | null {
  const seconds = Math.floor((new Date(deadline).getTime() - now) / 1000);
  if (seconds <= 0) return null;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
  if (hours > 0) return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
  if (minutes > 0) return `${minutes} menit`;
  return "kurang dari 1 menit";
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

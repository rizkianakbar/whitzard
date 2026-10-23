import type { Request, SnapshotResponse } from "@/lib/api";
import type { Dict } from "@/lib/i18n";

/** Open or funding on-chain: not finalized, expired or cancelled yet (it may be past its deadline). */
export const isOpen = (r: Pick<Request, "status">) => r.status === "open" || r.status === "funding";

/** Still collecting: open, and not yet past its deadline. */
export const isLive = (r: Pick<Request, "status" | "awaitingFinalize">) => isOpen(r) && !r.awaitingFinalize;

/** Asking the viewer for their share and still collecting. */
export const needsYou = (r: Request) => isLive(r) && (r.yourResponse === "pending" || r.yourResponse === "participating");

/** When a finished request finished (for sorting and display). */
export const endedAt = (r: Request): string => r.finalizedAt ?? r.cancelledAt ?? r.deadline;

export const byDeadline = (a: Request, b: Request) => Date.parse(a.deadline) - Date.parse(b.deadline);
export const byEndedDesc = (a: Request, b: Request) => Date.parse(endedAt(b)) - Date.parse(endedAt(a));

/** Whole percent collected, 0–100. Amounts are wei strings, so the maths stays in bigint. */
export function percentCollected(r: Pick<Request, "collected" | "amount">): number {
  const amount = BigInt(r.amount);
  if (amount === 0n) return 0;
  return Math.min(100, Number((BigInt(r.collected) * 100n) / amount));
}

export type ShareCell = { kind: "filled" | "declined" | "empty"; you: boolean };

/** One cell per member in the snapshot. Order: other contributors, then the viewer, then declined, then no answer yet. */
export function shareCells(size: number, contributed: number, declined: number, you?: SnapshotResponse | null): ShareCell[] {
  const yourKind: ShareCell["kind"] | null = you === "contributed" ? "filled" : you === "declined" ? "declined" : you ? "empty" : null;
  const count = (n: number, kind: ShareCell["kind"]) => Math.max(0, n - (yourKind === kind ? 1 : 0));
  const filled = count(contributed, "filled");
  const declinedOthers = count(declined, "declined");
  const empty = Math.max(0, size - filled - declinedOthers - (yourKind ? 1 : 0));
  return [
    ...Array.from({ length: filled }, () => ({ kind: "filled" as const, you: false })),
    ...(yourKind ? [{ kind: yourKind, you: true }] : []),
    ...Array.from({ length: declinedOthers }, () => ({ kind: "declined" as const, you: false })),
    ...Array.from({ length: empty }, () => ({ kind: "empty" as const, you: false })),
  ];
}

const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeParts(ms: number) {
  return {
    days: Math.floor(ms / DAY),
    hours: Math.floor((ms % DAY) / HOUR),
    minutes: Math.floor((ms % HOUR) / MINUTE),
    seconds: Math.floor((ms % MINUTE) / 1000),
  };
}

export const pad = (n: number) => String(n).padStart(2, "0");

/** "2 hari 4 jam" / "2 days 4 hrs", "3 jam 12 menit", "04:32" in the last hour. */
export function shortLeft(ms: number, t: Dict): string {
  const { days, hours, minutes, seconds } = timeParts(ms);
  if (days > 0 || hours > 0) return t.countdown.short(days, hours, minutes);
  return `${pad(minutes)}:${pad(seconds)}`;
}

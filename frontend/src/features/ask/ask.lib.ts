import { parseEther } from "viem";
import { z } from "zod";

import type { Dict } from "@/lib/i18n";

export const DAY = 24 * 60 * 60;

/** Collection windows, in seconds. The short ones are for demos and testing (the contract's minimum is 5 minutes). */
export const durations: { seconds: number; demo?: boolean }[] = [
  { seconds: 5 * 60, demo: true },
  { seconds: 10 * 60, demo: true },
  { seconds: DAY },
  { seconds: 3 * DAY },
  { seconds: 7 * DAY },
  { seconds: 14 * DAY },
];

export const durationLabel = (seconds: number, t: Dict) =>
  seconds < DAY ? t.ask.duration.minutes(seconds / 60) : t.ask.duration.days(seconds / DAY);

/** Evidence documents: up to 10 MB, PDF or image. */
export const MAX_BYTES = 10 * 1024 * 1024;
export const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

/** "300", "12,5", "12.5" or "1.000,5" → wei, or null if not a positive number with at most 18 decimals. */
export function parseAmount(value: string): bigint | null {
  const normalized = value.trim().replace(/\./g, (m, i, s) => (s.includes(",") ? "" : m)).replace(",", ".");
  if (!/^\d+(\.\d{1,18})?$/.test(normalized)) return null;
  const wei = parseEther(normalized);
  return wei > 0n ? wei : null;
}

/**
 * The request form. `members` is how many would share the request (Ready members other than the
 * requester), or undefined while it is still being counted. The parsed amount is in wei.
 */
export function askSchema(t: Dict, members: number | undefined) {
  const errors = t.ask.errors;
  return z.object({
    title: z.string().trim().min(1, errors.title).max(120, errors.titleLong),
    description: z.string().trim().min(1, errors.description),
    amount: z.string().transform((value, ctx) => {
      const wei = parseAmount(value);
      const message = members !== undefined && members <= 0 ? errors.noMembers : wei === null ? errors.amount : null;
      if (message) ctx.addIssue({ code: "custom", message });
      return wei ?? 0n;
    }),
    duration: z.string().transform(Number),
    file: z.instanceof(File, { error: errors.file }).refine((file) => file.size <= MAX_BYTES, errors.fileLarge),
  });
}

export type AskValues = z.output<ReturnType<typeof askSchema>>;

"use client";

import { Clock } from "lucide-react";

import { type Dict, useI18n } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import { cn } from "@/lib/utils";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Milliseconds until `deadline`, live. Ticks every second in the last hour (where minutes and
 * seconds matter), every 30 seconds before that. null on the server, where there is no clock.
 */
export function useRemaining(deadline: string): number | null {
  const end = new Date(deadline).getTime();
  const coarse = useNow();
  const now = useNow(coarse !== 0 && end - coarse < HOUR + 30_000 ? 1000 : 30_000);
  if (now === 0) return null;
  return Math.max(0, end - now);
}

function parts(ms: number) {
  return {
    days: Math.floor(ms / DAY),
    hours: Math.floor((ms % DAY) / HOUR),
    minutes: Math.floor((ms % HOUR) / MINUTE),
    seconds: Math.floor((ms % MINUTE) / 1000),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2 hari 4 jam" / "2 days 4 hrs", "3 jam 12 menit", "04:32" in the last hour. */
export function shortLeft(ms: number, t: Dict): string {
  const { days, hours, minutes, seconds } = parts(ms);
  if (days > 0 || hours > 0) return t.countdown.short(days, hours, minutes);
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** Under an hour: the time when people should notice that this closes soon. */
const urgent = (ms: number) => ms < HOUR;

/** A compact time-left chip for request cards. Turns turmeric in the last hour. */
export function CountdownPill({ deadline, className }: { deadline: string; className?: string }) {
  const { t } = useI18n();
  const ms = useRemaining(deadline);
  if (ms === null || ms === 0) return null;
  return (
    <span
      className={cn(
        "tabular inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors duration-500",
        urgent(ms) ? "bg-kunyit-soft text-kunyit-ink" : "bg-muted text-batu",
        className,
      )}
    >
      <Clock aria-hidden="true" className="size-4" />
      <span>{t.countdown.left(shortLeft(ms, t))}</span>
    </span>
  );
}

/**
 * The big countdown on a request page: three units (days/hours/minutes, or hours/minutes/seconds
 * in the last day), a bar for how much of the collection window is left, and the exact closing time.
 */
export function CountdownPanel({ openedAt, deadline }: { openedAt: string; deadline: string }) {
  const { t, fmt } = useI18n();
  const ms = useRemaining(deadline);
  const start = new Date(openedAt).getTime();
  const end = new Date(deadline).getTime();
  const total = Math.max(1, end - start);
  const left = ms ?? total;
  const p = parts(left);
  const unit = t.countdown.unit;
  const units: [number, string][] =
    p.days > 0
      ? [
          [p.days, unit.day(p.days)],
          [p.hours, unit.hour(p.hours)],
          [p.minutes, unit.minute(p.minutes)],
        ]
      : [
          [p.hours, unit.hour(p.hours)],
          [p.minutes, unit.minute(p.minutes)],
          [p.seconds, unit.second(p.seconds)],
        ];
  const hot = ms !== null && urgent(ms);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[13px] font-semibold text-batu">{t.countdown.closesIn}</span>
      <div role="timer" aria-label={t.countdown.closesInAria(shortLeft(left, t))} className="grid grid-cols-3 gap-2">
        {units.map(([value, label], i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl py-3 transition-colors duration-500",
              hot ? "bg-kunyit-soft text-kunyit-ink" : "bg-muted",
            )}
          >
            <span className="tabular text-[28px] leading-none font-extrabold tracking-tight">
              {ms === null ? "--" : pad(value)}
            </span>
            <span className={cn("text-xs font-medium", hot ? "text-kunyit-ink" : "text-batu")}>{label}</span>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full origin-left rounded-full transition-[scale,background-color] duration-1000 ease-linear", hot ? "bg-kunyit" : "bg-pandan")}
          style={{ scale: `${Math.min(1, left / total)} 1` }}
        />
      </div>
      <span className="text-[13px] text-batu">{fmt.date(deadline)}</span>
    </div>
  );
}

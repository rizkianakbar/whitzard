"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";

import { Swap } from "@/components/swap";
import { delay, range } from "@/features/landing/landing.lib";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DEMO_CELLS = 12;
const DEMO_START = 9;
const DEMO_SHARE = 20;

/**
 * The share grid as a toy: tap the empty shares to chip in. When the last one is in, the funds go
 * out together (every share turns green in a wave). Static on load, so a reload never blinks.
 */
export function HeroDemo() {
  const { t } = useI18n();
  const demo = t.landing.demo;
  const [filled, setFilled] = useState(() => new Set(range(DEMO_START)));
  const [chipped, setChipped] = useState<Set<number>>(() => new Set());
  const [sent, setSent] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const chip = (i: number) => {
    const next = new Set(filled).add(i);
    setFilled(next);
    setChipped(new Set(chipped).add(i));
    // A beat after the last share lands, the escrow pays out.
    if (next.size === DEMO_CELLS) timer.current = window.setTimeout(() => setSent(true), 550);
  };
  const replay = () => {
    setSent(false);
    setFilled(new Set(range(DEMO_START)));
    setChipped(new Set());
  };

  const firstEmpty = range(DEMO_CELLS).find((i) => !filled.has(i));
  const collected = filled.size * DEMO_SHARE;

  return (
    <figure className="hero-figure relative mx-auto w-full max-w-115">
      <div aria-hidden="true" className="tilt-backdrop absolute -inset-4 -z-10 -rotate-3 rounded-[36px] bg-pandan-soft grain" />
      <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-[0_24px_48px_-24px_rgb(15_61_49/0.25)] sm:p-8 grain">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-kunyit-soft text-lg font-bold text-kunyit-ink">
            S
          </span>
          <div className="flex flex-1 flex-col">
            <span className="font-bold">{demo.name}</span>
            <span className="text-sm text-batu">{demo.need}</span>
          </div>
          {sent && (
            <span className="pop-in flex items-center gap-1 rounded-full bg-daun-soft px-2.5 py-1 text-sm font-semibold text-daun-ink">
              <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
              {demo.forwarded}
            </span>
          )}
        </div>

        <div role="group" aria-label={demo.gridAria} className="grid grid-cols-6 gap-2.5">
          {range(DEMO_CELLS).map((i) => {
            const style = delay(sent ? i * 45 : 0);
            const look = cn(
              "hero-cell aspect-square rounded-xl border",
              sent ? "border-transparent bg-pandan" : filled.has(i) ? "border-transparent bg-kunyit" : "border-garis bg-card",
              chipped.has(i) && !sent && "chip-in",
            );
            return filled.has(i) ? (
              <span key={i} aria-hidden="true" className={look} style={style} />
            ) : (
              <button
                key={i}
                type="button"
                aria-label={demo.chip(DEMO_SHARE)}
                onClick={() => chip(i)}
                className={cn(look, "cursor-pointer hover:border-kunyit active:scale-90", i === firstEmpty && chipped.size === 0 && "invite")}
                style={style}
              />
            );
          })}
        </div>

        <div aria-live="polite" className="flex items-end justify-between gap-4 border-t pt-5">
          <div className="flex flex-col">
            <span className="tabular text-3xl font-extrabold tracking-tight">
              <Swap>{`${collected} WHZD`}</Swap>
            </span>
            <span className="text-sm text-batu">
              <Swap>{sent ? demo.sent : demo.collectedOf(DEMO_CELLS * DEMO_SHARE)}</Swap>
            </span>
          </div>
          {!sent && (
            <div className="flex flex-col items-end text-right">
              <span className="tabular text-lg font-bold">{DEMO_SHARE} WHZD</span>
              <span className="text-sm text-batu">{demo.perMember}</span>
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-6 flex min-h-9 items-center justify-center text-center text-sm text-batu">
        {sent ? (
          <button
            type="button"
            onClick={replay}
            className="pop-in pressable flex items-center gap-1.5 rounded-full px-3 py-2 font-semibold text-pandan hover:bg-pandan-soft"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {demo.replay}
          </button>
        ) : (
          demo.hint
        )}
      </figcaption>
    </figure>
  );
}

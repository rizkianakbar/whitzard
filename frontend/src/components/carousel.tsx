"use client";

import { Children, type ReactNode, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One card at a time, swiped (native scroll snapping, so touch and trackpads feel right) or paged
 * with the arrows and dots. Each child should be an <li> that sets its own width (w-full).
 */
export function Carousel({ label, children }: { label: string; children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const count = Children.count(children);
  // Cards can leave (collection ended): the browser clamps the scroll, and this clamps the dots.
  const current = Math.min(index, count - 1);

  // The card nearest the track's left edge is the current one.
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    let nearest = 0;
    items.forEach((item, i) => {
      if (Math.abs(item.offsetLeft - el.scrollLeft) < Math.abs(items[nearest].offsetLeft - el.scrollLeft)) nearest = i;
    });
    setIndex(nearest);
  };

  const go = (i: number) => {
    const el = track.current;
    const item = el?.children[i] as HTMLElement | undefined;
    if (!el || !item) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: item.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className="flex flex-col gap-3">
      <ul
        ref={track}
        onScroll={onScroll}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      {count > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Arrow label="Sebelumnya" disabled={current === 0} onClick={() => go(current - 1)}>
            <ChevronLeft className="size-4.5" />
          </Arrow>
          <div className="flex items-center">
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Permintaan ${i + 1} dari ${count}`}
                aria-current={i === current}
                onClick={() => go(i)}
                className="group flex h-8 items-center px-1"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-[width,background-color] duration-300 ease-out",
                    i === current ? "w-5 bg-pandan" : "w-2 bg-garis group-hover:bg-batu/50",
                  )}
                />
              </button>
            ))}
          </div>
          <Arrow label="Berikutnya" disabled={current === count - 1} onClick={() => go(current + 1)}>
            <ChevronRight className="size-4.5" />
          </Arrow>
        </div>
      )}
    </div>
  );
}

function Arrow({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pressable flex size-8 items-center justify-center rounded-full border bg-card text-arang hover:bg-muted disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

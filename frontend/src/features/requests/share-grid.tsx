"use client";

import { shareCells } from "@/features/requests/requests.lib";
import type { SnapshotResponse } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ShareGridProps = {
  size: number;
  contributed: number;
  declined: number;
  /** The viewer's own response if they are in the snapshot: their cell is outlined. */
  you?: SnapshotResponse | null;
  /** Animate the viewer's cell filling in (once, right after their contribution). */
  justContributed?: boolean;
  variant?: "large" | "medium" | "small";
  className?: string;
};

/**
 * Kisi iuran: one cell per member in the request's snapshot, all worth the same share.
 * Filled = contributed, hatched = declined, empty = no answer yet; the viewer's cell is outlined.
 */
export function ShareGrid(props: ShareGridProps) {
  const { size, contributed, declined, you, justContributed, variant = "large", className } = props;
  const { t } = useI18n();
  const cells = shareCells(size, contributed, declined, you);
  const large = variant === "large";
  const medium = variant === "medium";
  const label = t.shareGrid.aria(contributed, size, declined, !!you);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "grid",
        large
          ? "grid-cols-[repeat(auto-fill,minmax(32px,44px))] gap-2"
          : medium
            ? "grid-cols-[repeat(auto-fill,22px)] gap-1.5"
            : "grid-cols-[repeat(auto-fill,12px)] gap-0.75",
        className,
      )}
    >
      {cells.map((cell, i) => (
        <span
          key={i}
          className={cn(
            "box-border aspect-square",
            large ? "rounded-[10px]" : medium ? "rounded-[6px]" : "rounded-[3px]",
            cell.kind === "filled" && "bg-kunyit",
            cell.kind === "declined" && "border border-[#9aa8a1] bg-[repeating-linear-gradient(135deg,#fff_0_4px,#8a9891_4px_6px)]",
            cell.kind === "empty" && "border border-garis bg-card",
            cell.you && (large ? "border-[3px] border-pandan" : "border-2 border-pandan"),
            cell.you && cell.kind === "filled" && justContributed && "share-fill",
          )}
        />
      ))}
    </div>
  );
}

export function ShareLegend() {
  const { t } = useI18n();
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-batu">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3.5 rounded-[3px] bg-kunyit" />
        {t.shareGrid.helped}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3.5 rounded-[3px] border-2 border-pandan" />
        {t.shareGrid.you}
      </li>
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-3.5 rounded-[3px] border border-[#9aa8a1] bg-[repeating-linear-gradient(135deg,#fff_0_2px,#8a9891_2px_3.5px)]"
        />
        {t.shareGrid.declined}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3.5 rounded-[3px] border border-garis bg-card" />
        {t.shareGrid.noAnswer}
      </li>
    </ul>
  );
}

"use client";

import { percentCollected } from "@/features/requests/requests.lib";
import type { Request } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type FundingProgressProps = {
  request: Pick<Request, "collected" | "amount" | "contributors" | "snapshotSize">;
  size?: "md" | "lg";
  className?: string;
};

/**
 * How much has come in so far: the amount, a turmeric bar (turmeric = filled shares), and how many
 * members it came from. "lg" leads a request page; "md" sits in request cards.
 */
export function FundingProgress(props: FundingProgressProps) {
  const { request: r, size = "md", className } = props;
  const { t, fmt } = useI18n();
  const percent = percentCollected(r);
  const lg = size === "lg";
  return (
    <div className={cn("flex flex-col", lg ? "gap-4" : "gap-2.5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          {lg && <span className="text-[13px] font-semibold text-batu">{t.funding.collected}</span>}
          <span className="tabular leading-none">
            <strong className={cn("font-extrabold tracking-tight", lg ? "text-[44px]" : "text-2xl")}>
              {fmt.whzd(r.collected)}
            </strong>{" "}
            <span className={cn("text-batu", lg ? "text-lg" : "text-sm")}>{t.funding.ofAmount(fmt.whzd(r.amount), !lg)}</span>
          </span>
        </div>
        <span className={cn("tabular font-bold text-pandan", lg ? "text-xl" : "text-sm")}>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={t.funding.aria}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("overflow-hidden rounded-full bg-muted", lg ? "h-3" : "h-2")}
      >
        <div
          className="h-full origin-left rounded-full bg-kunyit transition-[scale] duration-700 ease-out"
          style={{ scale: `${percent / 100} 1` }}
        />
      </div>
      <span className={cn("text-batu", lg ? "text-sm" : "text-[13px]")}>
        {t.funding.helped(
          <strong className="tabular font-semibold text-arang">{r.contributors}</strong>,
          <span className="tabular">{r.snapshotSize}</span>,
        )}
      </span>
    </div>
  );
}

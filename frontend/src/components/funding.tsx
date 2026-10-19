import type { Request } from "@/lib/api";
import { formatWhzd } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Whole percent collected, 0–100. Amounts are wei strings, so the maths stays in bigint. */
export function percentCollected(r: Pick<Request, "collected" | "amount">): number {
  const amount = BigInt(r.amount);
  if (amount === 0n) return 0;
  return Math.min(100, Number((BigInt(r.collected) * 100n) / amount));
}

/**
 * How much has come in so far: the amount, a turmeric bar (turmeric = filled shares), and how many
 * members it came from. "lg" leads a request page; "md" sits in request cards.
 */
export function FundingProgress({
  request: r,
  size = "md",
  className,
}: {
  request: Pick<Request, "collected" | "amount" | "contributors" | "snapshotSize">;
  size?: "md" | "lg";
  className?: string;
}) {
  const percent = percentCollected(r);
  const lg = size === "lg";
  return (
    <div className={cn("flex flex-col", lg ? "gap-4" : "gap-2.5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          {lg && <span className="text-[13px] font-semibold text-batu">Terkumpul</span>}
          <span className="tabular leading-none">
            <strong className={cn("font-extrabold tracking-tight", lg ? "text-[44px]" : "text-2xl")}>
              {formatWhzd(r.collected)}
            </strong>{" "}
            <span className={cn("text-batu", lg ? "text-lg" : "text-sm")}>
              dari {formatWhzd(r.amount)} WHZD{lg ? "" : " terkumpul"}
            </span>
          </span>
        </div>
        <span className={cn("tabular font-bold text-pandan", lg ? "text-xl" : "text-sm")}>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Dana terkumpul"
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
        <strong className="tabular font-semibold text-arang">{r.contributors}</strong> dari{" "}
        <span className="tabular">{r.snapshotSize}</span> anggota sudah membantu
      </span>
    </div>
  );
}

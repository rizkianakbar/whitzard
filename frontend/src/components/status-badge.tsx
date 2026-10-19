import { Check, Hand } from "lucide-react";

import type { Request } from "@/lib/api";
import { formatWhzd } from "@/lib/format";
import { cn } from "@/lib/utils";

const styles = {
  open: ["Terbuka", "bg-pandan-soft text-pandan"],
  funding: ["Mengumpulkan", "bg-kunyit-soft text-kunyit-ink"],
  awaiting: ["Sedang dikirim", "bg-kunyit-soft text-kunyit-ink"],
  finalized: ["Terkirim", "bg-daun-soft text-daun-ink"],
  expired: ["Berakhir", "bg-muted text-batu"],
  cancelled: ["Dibatalkan", "bg-bata-soft text-bata-ink"],
} as const;

export function StatusBadge({ request, className }: { request: Pick<Request, "status" | "awaitingFinalize">; className?: string }) {
  const [label, style] = styles[request.awaitingFinalize ? "awaiting" : request.status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold", style, className)}>
      {label}
    </span>
  );
}

/** The viewer's own answer to a request, at a glance: helped, or passed this time. Nothing if unanswered. */
export function YourAnswer({
  request: r,
  className,
}: {
  request: Pick<Request, "yourResponse" | "share">;
  className?: string;
}) {
  if (r.yourResponse === "contributed") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-kunyit-soft py-1 pr-3 pl-1 text-[13px] font-semibold text-kunyit-ink",
          className,
        )}
      >
        <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-kunyit text-white">
          <Check className="size-3" strokeWidth={3} />
        </span>
        <span className="tabular">Kamu membantu {formatWhzd(r.share)} WHZD</span>
      </span>
    );
  }
  if (r.yourResponse === "declined") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-batu", className)}>
        <Hand aria-hidden="true" className="size-3.5" />
        Kamu tidak ikut
      </span>
    );
  }
  return null;
}

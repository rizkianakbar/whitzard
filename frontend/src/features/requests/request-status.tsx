"use client";

import { Check, Hand } from "lucide-react";

import type { Request } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const styles = {
  open: "bg-pandan-soft text-pandan",
  funding: "bg-kunyit-soft text-kunyit-ink",
  awaiting: "bg-kunyit-soft text-kunyit-ink",
  finalized: "bg-daun-soft text-daun-ink",
  expired: "bg-muted text-batu",
  cancelled: "bg-bata-soft text-bata-ink",
} as const;

type StatusBadgeProps = {
  request: Pick<Request, "status" | "awaitingFinalize">;
  className?: string;
};

export function StatusBadge(props: StatusBadgeProps) {
  const { request, className } = props;
  const { t } = useI18n();
  const status = request.awaitingFinalize ? "awaiting" : request.status;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold", styles[status], className)}>
      {t.status[status]}
    </span>
  );
}

type YourAnswerProps = {
  request: Pick<Request, "yourResponse" | "share">;
  className?: string;
};

/** The viewer's own answer to a request, at a glance: helped, or passed this time. Nothing if unanswered. */
export function YourAnswer(props: YourAnswerProps) {
  const { request: r, className } = props;
  const { t, fmt } = useI18n();
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
        <span className="tabular">{t.status.youHelped(fmt.whzd(r.share))}</span>
      </span>
    );
  }
  if (r.yourResponse === "declined") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-batu", className)}>
        <Hand aria-hidden="true" className="size-3.5" />
        {t.status.youDeclined}
      </span>
    );
  }
  return null;
}

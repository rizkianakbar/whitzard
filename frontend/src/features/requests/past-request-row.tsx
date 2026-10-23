"use client";

import { Check, ChevronRight, Clock, X } from "lucide-react";

import { endedAt } from "@/features/requests/requests.lib";
import { StatusBadge } from "@/features/requests/request-status";
import { RequestLink } from "@/features/requests/request-link";
import type { Request } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PastRequestRowProps = {
  request: Request;
  first: boolean;
  mine?: boolean;
};

/** A finished request, reduced to its outcome. `mine`: the viewer is the requester. */
export function PastRequestRow(props: PastRequestRowProps) {
  const { request: r, first, mine } = props;
  const { t, fmt } = useI18n();
  const outcome =
    r.status === "finalized"
      ? {
        icon: <Check className="size-4.5" strokeWidth={2.5} />,
        tone: "bg-daun-soft text-daun-ink",
        text: t.outcome.finalized(
          <strong className="tabular font-semibold text-arang">{fmt.whzd(r.collected)} WHZD</strong>,
          !!mine,
          r.contributors,
        ),
      }
      : r.status === "cancelled"
        ? {
          icon: <X className="size-4.5" />,
          tone: "bg-bata-soft text-bata-ink",
          text: mine ? t.outcome.cancelledMine : t.outcome.cancelled,
        }
        : r.awaitingFinalize
          ? { icon: <Clock className="size-4.5" />, tone: "bg-kunyit-soft text-kunyit-ink", text: t.outcome.awaiting }
          : { icon: <Clock className="size-4.5" />, tone: "bg-muted text-batu", text: t.outcome.expired };

  return (
    <li className={cn(!first && "border-t")}>
      <RequestLink id={r.id} className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/60 sm:px-5">
        <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", outcome.tone)}>
          {outcome.icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-semibold">{r.title ?? t.common.request(r.id)}</span>
          <span className="truncate text-sm text-batu">
            {outcome.text} · {fmt.dayMonth(endedAt(r))}
          </span>
        </span>
        <StatusBadge request={r} className="hidden sm:inline-flex" />
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-batu transition-transform duration-200 ease-out group-hover:translate-x-0.5"
        />
      </RequestLink>
    </li>
  );
}

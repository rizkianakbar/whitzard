"use client";

import { useState } from "react";
import Link from "next/link";

import { Avatar, callName } from "@/components/avatar";
import { CountdownPill } from "@/components/countdown";
import { FundingProgress } from "@/components/funding";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Request } from "@/lib/api";
import { formatWhzd, shortAddress } from "@/lib/format";
import { useMember, useRequests } from "@/lib/queries";
import { cn } from "@/lib/utils";

const scopes = [
  { id: "all", label: "Semua" },
  { id: "for-me", label: "Untukku" },
  { id: "mine", label: "Milikku" },
] as const;

export function RequestList() {
  const [scope, setScope] = useState<(typeof scopes)[number]["id"]>("all");
  const { data, isPending } = useRequests(scope);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[39px] leading-tight font-extrabold text-pandan">Permintaan</h1>
        <Link href="/ajukan" className={buttonVariants({ variant: "outline" })}>
          Ajukan bantuan
        </Link>
      </div>
      <div role="group" aria-label="Tampilkan" className="flex gap-2">
        {scopes.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={scope === s.id}
            onClick={() => setScope(s.id)}
            className={cn(
              "pressable h-11 rounded-full border bg-card px-5 font-semibold text-batu hover:text-arang",
              scope === s.id && "border-pandan bg-pandan text-white hover:text-white",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      {isPending ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : !data?.length ? (
        <p className="rounded-3xl border border-dashed bg-card p-8 leading-relaxed text-batu">
          {scope === "mine"
            ? "Kamu belum pernah mengajukan bantuan."
            : scope === "for-me"
              ? "Belum ada permintaan yang ditujukan kepadamu. Nyalakan siap membantu di beranda supaya ikut dihitung."
              : "Belum ada permintaan."}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestCard({ request: r }: { request: Request }) {
  const { data: member } = useMember(r.requester);
  const live = (r.status === "open" || r.status === "funding") && !r.awaitingFinalize;
  return (
    <li className="lift group relative flex flex-col gap-5 rounded-2xl border bg-card p-5 hover:border-pandan/40 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge request={r} />
        {live && <CountdownPill deadline={r.deadline} />}
      </div>
      <div className="flex flex-col gap-1.5">
        {/* The whole card is the link target; the stretched ::after covers it. */}
        <Link
          href={`/permintaan/${r.id}`}
          className="text-xl leading-snug font-bold text-balance after:absolute after:inset-0 after:rounded-2xl group-hover:underline"
        >
          {r.title ?? `Permintaan nomor ${r.id}`}
        </Link>
        {r.description && <p className="line-clamp-2 leading-relaxed text-batu">{r.description}</p>}
      </div>
      <FundingProgress request={r} className="mt-auto" />
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar address={r.requester} profile={member?.profile} className="size-8 text-xs" />
          <span className="truncate text-sm font-semibold">{callName(member?.profile, shortAddress(r.requester))}</span>
        </div>
        <span className="tabular shrink-0 text-sm text-batu">
          Bagian <strong className="font-semibold text-arang">{formatWhzd(r.share)} WHZD</strong>
        </span>
      </div>
    </li>
  );
}

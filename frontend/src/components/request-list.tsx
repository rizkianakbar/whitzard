"use client";

import { useState } from "react";
import Link from "next/link";

import { ShareGrid } from "@/components/share-grid";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatWhzd, timeLeft } from "@/lib/format";
import { useRequests } from "@/lib/queries";
import { useNow } from "@/lib/now";
import { cn } from "@/lib/utils";

const scopes = [
  { id: "all", label: "Semua" },
  { id: "for-me", label: "Untukku" },
  { id: "mine", label: "Milikku" },
] as const;

export function RequestList() {
  const [scope, setScope] = useState<(typeof scopes)[number]["id"]>("all");
  const { data, isPending } = useRequests(scope);
  const now = useNow();

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
        <ul className="overflow-hidden rounded-3xl border bg-card">
          {data.map((r, i) => {
            const left = timeLeft(r.deadline, now);
            const live = (r.status === "open" || r.status === "funding") && !r.awaitingFinalize && left;
            return (
              <li key={r.id} className={cn("flex flex-wrap items-center gap-x-6 gap-y-3 p-6", i > 0 && "border-t")}>
                <div className="flex min-w-70 flex-1 flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge request={r} />
                    <span className="text-[13px] text-batu">Nomor {r.id}</span>
                  </div>
                  <Link href={`/permintaan/${r.id}`} className="text-xl font-bold hover:underline">
                    {r.title ?? `Permintaan nomor ${r.id}`}
                  </Link>
                  <ShareGrid variant="medium" size={r.snapshotSize} contributed={r.contributors} declined={0} you={r.yourResponse} />
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <span className="tabular font-semibold">
                    {formatWhzd(r.collected)} dari {formatWhzd(r.amount)} WHZD
                  </span>
                  <span className="text-[13px] text-batu">{live ? `Ditutup dalam ${left}` : `Bagian ${formatWhzd(r.share)} WHZD`}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

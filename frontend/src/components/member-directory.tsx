"use client";

import { useState } from "react";

import { Avatar, callName } from "@/components/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { MemberProfile } from "@/lib/api";
import { shortAddress } from "@/lib/format";
import { useMembers } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const PREVIEW = 8;

/** The community: who is in it, and who is counted in new requests right now. */
export function MemberDirectory() {
  const { data, isPending } = useMembers();
  const [all, setAll] = useState(false);
  const members = data ?? [];
  const ready = members.filter((m) => m.ready).length;
  const shown = all ? members : members.slice(0, PREVIEW);

  return (
    <section aria-labelledby="members" className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="members" className="text-[25px] leading-tight font-extrabold">
          Anggota
        </h2>
        <p className="text-sm text-batu">
          {isPending ? "Memuat…" : `${members.length} anggota, ${ready} sedang siap membantu.`}
        </p>
      </div>
      {isPending ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((m) => (
              <MemberTile key={m.address} member={m} />
            ))}
          </ul>
          {members.length > PREVIEW && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="pressable self-start rounded-full px-1 font-semibold text-pandan underline underline-offset-4"
            >
              {all ? "Tampilkan lebih sedikit" : `Tampilkan semua (${members.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function MemberTile({ member: m }: { member: MemberProfile }) {
  const { address } = useSession();
  const you = address?.toLowerCase() === m.address.toLowerCase();
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl border bg-card p-4", you && "border-pandan/40")}>
      <span className="relative shrink-0">
        <Avatar address={m.address} profile={m} className="size-11 text-sm" />
        <span
          aria-hidden="true"
          className={cn("absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-card", m.ready ? "bg-daun" : "bg-garis")}
        />
      </span>
      <div className="flex min-w-0 flex-col leading-snug">
        <span className="truncate font-semibold">
          {callName(m, shortAddress(m.address))}
          {you && <span className="font-normal text-batu"> (kamu)</span>}
        </span>
        {m.city && <span className="truncate text-[13px] text-batu">{m.city}</span>}
        <span className="truncate text-[13px] text-batu">
          {m.ready ? "Siap membantu" : "Sedang tidak siap"}
          {/* {m.contributions > 0 && ` · ${m.contributions}× membantu`} */}
        </span>
      </div>
    </li>
  );
}

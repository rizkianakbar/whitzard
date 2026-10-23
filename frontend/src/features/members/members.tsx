"use client";

import { useState } from "react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Avatar } from "@/features/members/member-avatar";
import { useMembers } from "@/features/members/members.hooks";
import { callName } from "@/features/members/members.lib";
import { useSession } from "@/features/session/session.hooks";
import type { MemberProfile } from "@/lib/api";
import { shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PREVIEW = 8;

/** The community: who is in it, and who is counted in new requests right now. */
export function MemberDirectory() {
  const { t } = useI18n();
  const { data, isPending } = useMembers();
  const [all, setAll] = useState(false);
  const members = data ?? [];
  const ready = members.filter((m) => m.ready).length;
  const shown = all ? members : members.slice(0, PREVIEW);

  return (
    <section aria-labelledby="members" className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="members" className="text-[25px] leading-tight font-extrabold">
          {t.members.title}
        </h2>
        <p className="text-sm text-batu">{isPending ? t.common.loading : t.members.summary(members.length, ready)}</p>
      </div>
      {isPending ? (
        <TilesSkeleton />
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
              {all ? t.common.showLess : t.common.showAll(members.length)}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** The directory before anything has loaded: same heading, a row of greyed-out tiles. */
export function MemberDirectorySkeleton() {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[25px] leading-tight font-extrabold">{t.members.title}</h2>
        <p className="text-sm text-batu">{t.common.loading}</p>
      </div>
      <TilesSkeleton />
    </section>
  );
}

function TilesSkeleton() {
  return (
    <ul aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col leading-snug">
            <SkeletonText className="w-3/4" />
            <SkeletonText className="w-1/2 text-[13px]" />
            <SkeletonText className="w-2/3 text-[13px]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

type MemberTileProps = {
  member: MemberProfile;
};

function MemberTile(props: MemberTileProps) {
  const { member: m } = props;
  const { t } = useI18n();
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
          {you && <span className="font-normal text-batu">{t.members.you}</span>}
        </span>
        {m.city && <span className="truncate text-[13px] text-batu">{m.city}</span>}
        <span className="truncate text-[13px] text-batu">{m.ready ? t.members.ready : t.members.notReady}</span>
      </div>
    </li>
  );
}

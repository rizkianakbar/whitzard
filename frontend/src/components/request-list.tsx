"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";

import { Avatar, callName } from "@/components/avatar";
import { CountdownPill } from "@/components/countdown";
import { FundingProgress } from "@/components/funding";
import { endedAt, isLive, PastRequestRow } from "@/components/request-row";
import { StatusBadge, YourAnswer } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Request } from "@/lib/api";
import { formatWhzd, shortAddress } from "@/lib/format";
import { useMember, useRequests } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const scopes = [
  { id: "all", label: "Semua" },
  { id: "for-me", label: "Untukku" },
  { id: "mine", label: "Milikku" },
] as const;
const states = [
  { id: "all", label: "Semua" },
  { id: "live", label: "Berjalan" },
  { id: "done", label: "Selesai" },
] as const;
type Scope = (typeof scopes)[number]["id"];
type State = (typeof states)[number]["id"];

const PAST_PREVIEW = 5;

/** Asking the viewer for their share and still open: the most important thing on this page. */
const needsYou = (r: Request) => isLive(r) && (r.yourResponse === "pending" || r.yourResponse === "participating");
const byDeadline = (a: Request, b: Request) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
const byEndedDesc = (a: Request, b: Request) => new Date(endedAt(b)).getTime() - new Date(endedAt(a)).getTime();

/**
 * All requests, ordered by what matters now: the ones waiting for your answer (closing soonest
 * first), then everything else still collecting, then finished ones as one-line outcomes.
 */
export function RequestList() {
  const { address } = useSession();
  const [scope, setScope] = useState<Scope>("all");
  const [state, setState] = useState<State>("all");
  const [query, setQuery] = useState("");
  const [showAllPast, setShowAllPast] = useState(false);
  const { data, isPending } = useRequests(scope);
  // Only the "for me" listing carries your answer (backend: member=me), so lend it to the others.
  const { data: forMeList } = useRequests("for-me");
  const responses = new Map((forMeList ?? []).map((r) => [r.id, r.yourResponse]));
  const q = useDeferredValue(query.trim().toLowerCase());

  const matches = (data ?? []).map((r) => (r.yourResponse ? r : { ...r, yourResponse: responses.get(r.id) })).filter(
    (r) => !q || r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q),
  );
  const live = matches.filter(isLive);
  const forYou = live.filter(needsYou).sort(byDeadline);
  const running = live.filter((r) => !needsYou(r)).sort(byDeadline);
  const past = matches.filter((r) => !isLive(r)).sort(byEndedDesc);
  const shownPast = showAllPast ? past : past.slice(0, PAST_PREVIEW);
  const showLive = state !== "done";
  const showPast = state !== "live";
  const nothing = (!showLive || live.length === 0) && (!showPast || past.length === 0);
  const mine = (r: Request) => !!address && r.requester.toLowerCase() === address.toLowerCase();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[39px] leading-tight font-extrabold text-pandan">Permintaan</h1>
          {!isPending && (
            <p className="text-batu">
              {forYou.length > 0 ? (
                <>
                  <strong className="tabular text-arang">{forYou.length}</strong> permintaan menunggu jawabanmu.
                </>
              ) : live.length > 0 ? (
                <>
                  <strong className="tabular text-arang">{live.length}</strong> permintaan sedang berjalan.
                </>
              ) : (
                "Tidak ada permintaan yang sedang berjalan."
              )}
            </p>
          )}
        </div>
        <Link href="/ajukan" className={buttonVariants({ variant: "outline" })}>
          Ajukan bantuan
        </Link>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Segmented label="Tampilkan" options={scopes} value={scope} onChange={(v) => { setScope(v); setShowAllPast(false); }} />
        <Segmented label="Status" options={states} value={state} onChange={setState} />
        <label className="relative flex-1 md:max-w-80 md:ml-auto">
          <span className="sr-only">Cari permintaan</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-batu" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul atau cerita"
            className="h-11 w-full rounded-full border bg-card pr-10 pl-10 text-base outline-none placeholder:text-batu focus-visible:border-ring [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => setQuery("")}
              className="pressable absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-batu hover:bg-muted"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </label>
      </div>

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : nothing ? (
        <p className="rounded-2xl border border-dashed bg-card p-8 leading-relaxed text-batu">
          {q
            ? `Tidak ada permintaan yang cocok dengan "${query.trim()}".`
            : state === "live"
              ? "Tidak ada permintaan yang sedang berjalan."
              : state === "done"
                ? "Belum ada permintaan yang selesai."
                : scope === "mine"
                  ? "Kamu belum pernah mengajukan bantuan."
                  : scope === "for-me"
                    ? "Belum ada permintaan yang ditujukan kepadamu. Nyalakan siap membantu di beranda supaya ikut dihitung."
                    : "Belum ada permintaan."}
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {showLive && forYou.length > 0 && (
            <Section id="for-you" title="Menunggu jawabanmu" count={forYou.length}>
              <ul className="grid gap-4 md:grid-cols-2">
                {forYou.map((r) => (
                  <RequestCard key={r.id} request={r} highlight />
                ))}
              </ul>
            </Section>
          )}
          {showLive && running.length > 0 && (
            <Section id="running" title="Sedang berjalan" count={running.length}>
              <ul className="grid gap-4 md:grid-cols-2">
                {running.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </ul>
            </Section>
          )}
          {showPast && past.length > 0 && (
            <Section id="past" title="Sudah selesai" count={past.length}>
              <ul className="overflow-hidden rounded-2xl border bg-card">
                {shownPast.map((r, i) => (
                  <PastRequestRow key={r.id} request={r} first={i === 0} mine={mine(r)} />
                ))}
              </ul>
              {past.length > PAST_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllPast((v) => !v)}
                  className="pressable self-start rounded-full px-1 font-semibold text-pandan underline underline-offset-4"
                >
                  {showAllPast ? "Tampilkan lebih sedikit" : `Tampilkan semua (${past.length})`}
                </button>
              )}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex shrink-0 gap-1 self-start rounded-full border bg-card p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "pressable h-9 rounded-full px-4 text-sm font-semibold text-batu hover:text-arang",
            value === o.id && "bg-pandan text-white hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="flex items-center gap-2.5 text-xl font-extrabold">
        {title}
        <span className="tabular rounded-full bg-muted px-2.5 py-0.5 text-sm font-bold text-batu">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function RequestCard({ request: r, highlight }: { request: Request; highlight?: boolean }) {
  const { data: member } = useMember(r.requester);
  return (
    <li
      className={cn(
        "group relative flex flex-col gap-5 rounded-2xl border bg-card p-5 transition-colors duration-200 sm:p-6",
        highlight ? "border-kunyit/60 hover:border-kunyit" : "hover:border-pandan/40",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge request={r} />
        <CountdownPill deadline={r.deadline} />
      </div>
      <div className="flex flex-col gap-1.5">
        {/* The whole card is the link target; the stretched ::after covers it. */}
        <Link
          href={`/permintaan/${r.id}`}
          className="text-xl leading-snug font-bold text-balance after:absolute after:inset-0 after:rounded-2xl group-hover:underline"
        >
          {r.title ?? `Permintaan #${r.id}`}
        </Link>
        {r.description && <p className="line-clamp-2 leading-relaxed text-batu">{r.description}</p>}
      </div>
      <FundingProgress request={r} className="mt-auto" />
      <YourAnswer request={r} className="self-start" />
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar address={r.requester} profile={member?.profile} className="size-8 text-xs" />
          <span className="truncate text-sm font-semibold">{callName(member?.profile, shortAddress(r.requester))}</span>
        </div>
        {highlight ? (
          <span className="tabular flex shrink-0 items-center gap-1 text-sm font-bold text-pandan">
            Bantu {formatWhzd(r.share)} WHZD
            <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </span>
        ) : (
          <span className="tabular shrink-0 text-sm text-batu">
            Bagian <strong className="font-semibold text-arang">{formatWhzd(r.share)} WHZD</strong>
          </span>
        )}
      </div>
    </li>
  );
}

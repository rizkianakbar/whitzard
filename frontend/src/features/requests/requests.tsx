"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Avatar } from "@/features/members/member-avatar";
import { useProfile } from "@/features/members/members.hooks";
import { callName } from "@/features/members/members.lib";
import { CountdownPill } from "@/features/requests/countdown";
import { FundingProgress, FundingProgressSkeleton } from "@/features/requests/funding-progress";
import { type RequestScope, useRequests } from "@/features/requests/requests.hooks";
import { byDeadline, byEndedDesc, isLive, needsYou } from "@/features/requests/requests.lib";
import { PastRequestRow } from "@/features/requests/past-request-row";
import { StatusBadge, YourAnswer } from "@/features/requests/request-status";
import { useSession } from "@/features/session/session.hooks";
import type { Request } from "@/lib/api";
import { shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const scopes = ["all", "for-me", "mine"] as const satisfies RequestScope[];
const states = ["all", "live", "done"] as const;
type State = (typeof states)[number];

const PAST_PREVIEW = 5;

/**
 * All requests, ordered by what matters now: the ones waiting for your answer (closing soonest
 * first), then everything else still collecting, then finished ones as one-line outcomes.
 */
export function RequestList() {
  const { t } = useI18n();
  const text = t.requests;
  const { address } = useSession();
  const [scope, setScope] = useState<RequestScope>("all");
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
      <Header>
        {isPending ? (
          <SkeletonText className="w-64" />
        ) : (
          <p className="text-batu">
            {forYou.length > 0
              ? text.waitingYou(<strong className="tabular text-arang">{forYou.length}</strong>)
              : live.length > 0
                ? text.running(<strong className="tabular text-arang">{live.length}</strong>)
                : text.noneRunning}
          </p>
        )}
      </Header>

      <Filters
        scope={scope}
        onScope={(v) => {
          setScope(v);
          setShowAllPast(false);
        }}
        state={state}
        onState={setState}
        query={query}
        onQuery={setQuery}
      />

      {isPending ? (
        <CardsSkeleton />
      ) : nothing ? (
        <p className="rounded-2xl border border-dashed bg-card p-8 leading-relaxed text-batu">
          {q
            ? text.empty.query(query.trim())
            : state === "live"
              ? text.empty.live
              : state === "done"
                ? text.empty.done
                : scope === "mine"
                  ? text.empty.mine
                  : scope === "for-me"
                    ? text.empty.forMe
                    : text.empty.all}
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {showLive && forYou.length > 0 && (
            <Section id="for-you" title={text.sections.forYou} count={forYou.length}>
              <ul className="grid gap-4 md:grid-cols-2">
                {forYou.map((r) => (
                  <RequestCard key={r.id} request={r} highlight />
                ))}
              </ul>
            </Section>
          )}
          {showLive && running.length > 0 && (
            <Section id="running" title={text.sections.running} count={running.length}>
              <ul className="grid gap-4 md:grid-cols-2">
                {running.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </ul>
            </Section>
          )}
          {showPast && past.length > 0 && (
            <Section id="past" title={text.sections.past} count={past.length}>
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
                  {showAllPast ? t.common.showLess : t.common.showAll(past.length)}
                </button>
              )}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

/** The list's frame before anything has loaded: the same header, filters and cards, greyed out. */
export function RequestListSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Header>
        <SkeletonText className="w-64" />
      </Header>
      <div inert>
        <Filters scope="all" onScope={noop} state="all" onState={noop} query="" onQuery={noop} />
      </div>
      <CardsSkeleton />
    </div>
  );
}

const noop = () => {};

type HeaderProps = {
  /** The summary line under the title. */
  children: React.ReactNode;
};

function Header(props: HeaderProps) {
  const { children } = props;
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[39px] leading-tight font-extrabold text-pandan">{t.requests.title}</h1>
        {children}
      </div>
      <Link href="/ask" className={buttonVariants({ variant: "outline" })}>
        {t.common.askForHelp}
      </Link>
    </div>
  );
}

type FiltersProps = {
  scope: RequestScope;
  onScope: (scope: RequestScope) => void;
  state: State;
  onState: (state: State) => void;
  query: string;
  onQuery: (query: string) => void;
};

function Filters(props: FiltersProps) {
  const { scope, onScope, state, onState, query, onQuery } = props;
  const { t } = useI18n();
  const text = t.requests;
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <Segmented label={text.scopeLabel} options={scopes.map((id) => ({ id, label: text.scopes[id] }))} value={scope} onChange={onScope} />
      <Segmented label={text.stateLabel} options={states.map((id) => ({ id, label: text.states[id] }))} value={state} onChange={onState} />
      <label className="relative flex-1 md:max-w-80 md:ml-auto">
        <span className="sr-only">{text.search}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-batu" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={text.searchPlaceholder}
          className="h-11 w-full rounded-full border bg-card pr-10 pl-10 text-base outline-none placeholder:text-batu focus-visible:border-ring [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label={text.clearSearch}
            onClick={() => onQuery("")}
            className="pressable absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-batu hover:bg-muted"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </label>
    </div>
  );
}

/** A section heading and two cards: what the first section of the list looks like once it loads. */
function CardsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5 text-xl font-extrabold">
        <SkeletonText className="w-44" />
        <Skeleton className="h-6 w-8 rounded-full" />
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        <RequestCardSkeleton />
        <RequestCardSkeleton />
      </ul>
    </div>
  );
}

function RequestCardSkeleton() {
  return (
    <li className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="flex flex-col gap-1.5">
        <SkeletonText className="w-3/4 text-xl leading-snug font-bold" />
        <div className="leading-relaxed">
          <SkeletonText className="w-full" />
          <SkeletonText className="w-2/3" />
        </div>
      </div>
      <FundingProgressSkeleton className="mt-auto" />
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-8 rounded-full" />
          <SkeletonText className="w-24 text-sm" />
        </div>
        <SkeletonText className="w-28 text-sm" />
      </div>
    </li>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

function Segmented<T extends string>(props: SegmentedProps<T>) {
  const { label, options, value, onChange } = props;
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

type SectionProps = {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
};

function Section(props: SectionProps) {
  const { id, title, count, children } = props;
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

type RequestCardProps = {
  request: Request;
  highlight?: boolean;
};

function RequestCard(props: RequestCardProps) {
  const { request: r, highlight } = props;
  const { t, fmt } = useI18n();
  const profile = useProfile(r.requester);
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
          href={`/requests/${r.id}`}
          className="text-xl leading-snug font-bold text-balance after:absolute after:inset-0 after:rounded-2xl group-hover:underline"
        >
          {r.title ?? t.common.request(r.id)}
        </Link>
        {r.description && <p className="line-clamp-2 leading-relaxed text-batu">{r.description}</p>}
      </div>
      <FundingProgress request={r} className="mt-auto" />
      <YourAnswer request={r} className="self-start" />
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar address={r.requester} profile={profile} className="size-8 text-xs" />
          <span className="truncate text-sm font-semibold">{callName(profile, shortAddress(r.requester))}</span>
        </div>
        {highlight ? (
          <span className="tabular flex shrink-0 items-center gap-1 text-sm font-bold text-pandan">
            {t.common.help(fmt.whzd(r.share))}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </span>
        ) : (
          <span className="tabular shrink-0 text-sm text-batu">
            {t.requests.share(<strong className="font-semibold text-arang">{fmt.whzd(r.share)} WHZD</strong>)}
          </span>
        )}
      </div>
    </li>
  );
}

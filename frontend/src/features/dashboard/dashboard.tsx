"use client";

import Link from "next/link";
import { ArrowRight, Check, HandHeart, Hourglass, RotateCcw, Send, Users } from "lucide-react";
import { useConfig } from "wagmi";
import { writeContract } from "wagmi/actions";

import { Carousel } from "@/components/carousel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { MemberDirectory, MemberDirectorySkeleton } from "@/features/members/members";
import { Avatar } from "@/features/members/member-avatar";
import { useMe, useMemberStats, useProfile, useRefunds } from "@/features/members/members.hooks";
import { callName, hasProfile, hasTokens } from "@/features/members/members.lib";
import { CountdownPill } from "@/features/requests/countdown";
import { FundingProgress, FundingProgressSkeleton } from "@/features/requests/funding-progress";
import { useDecline, useEligibility, useRequests } from "@/features/requests/requests.hooks";
import { byDeadline, isOpen } from "@/features/requests/requests.lib";
import { StatusBadge, YourAnswer } from "@/features/requests/request-status";
import { TopUpDialog } from "@/features/top-up/top-up";
import { BusyLabel, TxLabel } from "@/features/tx/tx-label";
import { useTx } from "@/features/tx/tx.hooks";
import { api, type Member, type Request } from "@/lib/api";
import { escrow, registry } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";
import { type Dict, useI18n } from "@/lib/i18n";
import { keys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

function greeting(t: Dict): string {
  const hour = new Date().getHours();
  if (hour < 11) return t.dashboard.greeting.morning;
  if (hour < 15) return t.dashboard.greeting.noon;
  if (hour < 19) return t.dashboard.greeting.afternoon;
  return t.dashboard.greeting.evening;
}

export function Dashboard() {
  const { data: me } = useMe();
  if (!me) return <DashboardSkeleton />;
  const name = me.profile?.nickname ?? me.profile?.displayName?.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <Greeting name={name} />
      <SetupBanner me={me} />
      <RefundNotice />
      <Wallet me={me} />
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-8">
        <Waiting />
        <MyRequests />
      </div>
      <MemberDirectory />
    </div>
  );
}

/** The dashboard before the member has loaded: the same frame and headings, grey where data goes. */
export function DashboardSkeleton() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-8">
      <Greeting loading />
      <WalletSkeleton />
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-8">
        <section className="flex flex-col gap-4">
          <SectionTitle id="waiting" description={t.dashboard.waiting.description}>
            {t.dashboard.waiting.title}
          </SectionTitle>
          <ul className="flex">
            <RequestCardSkeleton />
          </ul>
        </section>
        <section className="flex flex-col gap-4">
          <SectionTitle id="mine" description={t.dashboard.mine.description}>
            {t.dashboard.mine.title}
          </SectionTitle>
          <ul className="flex flex-col gap-4">
            <RequestCardSkeleton mine />
          </ul>
        </section>
      </div>
      <MemberDirectorySkeleton />
    </div>
  );
}

type GreetingProps = {
  name?: string;
  /** The skeleton prerenders, where the time of day is unknown: grey out the line instead. */
  loading?: boolean;
};

function Greeting(props: GreetingProps) {
  const { name, loading } = props;
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      {loading ? (
        <SkeletonText className="w-72 text-[39px] leading-tight font-extrabold" />
      ) : (
        <h1 className="text-[39px] leading-tight font-extrabold text-pandan">
          {greeting(t)}
          {name ? `, ${name}` : ""}
        </h1>
      )}
      <Link href="/ask" className={buttonVariants({ variant: "outline" })}>
        {t.common.askForHelp}
      </Link>
    </div>
  );
}

type SetupBannerProps = {
  me: Member;
};

/** Shown until the profile and first top-up are done (Ready is a choice, so it doesn't count). */
function SetupBanner(props: SetupBannerProps) {
  const { me } = props;
  const { t } = useI18n();
  const profileDone = hasProfile(me);
  if (profileDone && hasTokens(me)) return null;
  return (
    <Link
      href="/join"
      className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-dashed border-pandan/30 bg-card p-5 hover:border-pandan/60"
    >
      <div className="flex min-w-60 flex-1 flex-col gap-1">
        <span className="font-bold">{t.dashboard.setup.title}</span>
        <span className="text-batu">{t.dashboard.setup.body(!profileDone)}</span>
      </div>
      <ArrowRight aria-hidden="true" className="size-5 text-pandan" />
    </Link>
  );
}

// ---------------------------------------------------------------- wallet

type WalletProps = {
  me: Member;
};

/** Balance, what has moved through it, and whether new requests count you in: one card. */
function Wallet(props: WalletProps) {
  const { me } = props;
  const config = useConfig();
  const { t, fmt } = useI18n();
  const text = t.dashboard.ready;
  const ready = useTx();
  const { data: st } = useMemberStats();
  const empty = BigInt(me.chain.balance) === 0n;

  const toggleReady = (value: boolean) =>
    ready.run({
      prompt: value
        ? { title: text.promptOn, detail: t.wallet.call("Registry", "setReady", text.detailOn) }
        : { title: text.promptOff, detail: t.wallet.call("Registry", "setReady", text.detailOff) },
      send: () => writeContract(config, { ...registry, functionName: "setReady", args: [value] }),
      // The chain flips first; the member list reads the indexed copy, so wait for both.
      synced: async () => {
        const m = await api.member(me.address);
        return m.chain.ready === value && m.profile?.ready === value;
      },
      success: value ? text.successOn : text.successOff,
      invalidate: [keys.member(me.address), keys.proof, keys.members],
    });

  return (
    <section aria-label={t.dashboard.wallet.label} className="flex flex-col gap-6 rounded-3xl bg-pandan-deep grain grain-light p-6 text-white sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-white/70">{t.dashboard.wallet.label}</span>
            <span className="tabular text-[49px] leading-none font-extrabold tracking-tight">
              {fmt.whzd(me.chain.balance)} <span className="text-xl font-bold tracking-normal">WHZD</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TopUpDialog me={me} trigger={<Button className="bg-white text-pandan-deep hover:bg-pandan-soft">{t.common.topUp}</Button>} />
            <span className="text-sm text-white/70">{t.dashboard.wallet.testToken}</span>
          </div>
        </div>
        <dl className="grid min-w-64 grid-cols-2 gap-x-8 gap-y-1 sm:gap-x-12">
          <Figure label={t.dashboard.wallet.given} value={st?.given} note={st && t.dashboard.wallet.givenNote(st.helped)} />
          <Figure
            label={t.dashboard.wallet.received}
            value={st?.received}
            note={st && (st.requests ? t.dashboard.wallet.receivedNote(st.funded) : t.dashboard.wallet.neverAsked)}
          />
        </dl>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl bg-white/8 px-4 py-3.5">
          <Switch
            size="lg"
            aria-labelledby="ready-label"
            aria-describedby="ready-help"
            checked={me.chain.ready}
            disabled={ready.busy || (!me.chain.ready && empty)}
            onCheckedChange={(value) => void toggleReady(value)}
            className="data-checked:bg-kunyit data-unchecked:bg-white/25"
          />
          <div className="flex min-w-0 flex-col">
            <span id="ready-label" className="font-semibold">
              {text.label}
            </span>
            <span id="ready-help" className="text-[13px] leading-snug text-white/70">
              {ready.busy ? t.tx.phase[ready.phase] : me.chain.ready ? text.on : empty ? text.empty : text.off}
            </span>
          </div>
        </div>
        <CanRequest />
      </div>
    </section>
  );
}

/** The balance card before the member has loaded: labels in place, the numbers and switch greyed out. */
function WalletSkeleton() {
  const { t } = useI18n();
  const text = t.dashboard.wallet;
  return (
    <section
      aria-label={text.label}
      aria-busy="true"
      className="flex flex-col gap-6 rounded-3xl bg-pandan-deep grain grain-light p-6 text-white [--skeleton:rgb(255_255_255/0.15)] sm:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-white/70">{text.label}</span>
            <SkeletonText className="w-60 text-[49px] leading-none" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-11 w-28 rounded-full bg-white/15" />
            <span className="text-sm text-white/70">{text.testToken}</span>
          </div>
        </div>
        <dl className="grid min-w-64 grid-cols-2 gap-x-8 gap-y-1 sm:gap-x-12">
          <Figure label={text.given} />
          <Figure label={text.received} />
        </dl>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl bg-white/8 px-4 py-3.5">
          <Skeleton className="h-8 w-13 shrink-0 rounded-full bg-white/15" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">{t.dashboard.ready.label}</span>
            <SkeletonText className="w-4/5 text-[13px] leading-snug" />
          </div>
        </div>
        <CanRequest />
      </div>
    </section>
  );
}

type FigureProps = {
  label: string;
  value?: string;
  note?: string | false;
};

/** A total on the balance card; a placeholder until (or if) the totals load. */
function Figure(props: FigureProps) {
  const { label, value, note } = props;
  const { fmt } = useI18n();
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-white/70">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        <span className="tabular text-2xl font-bold">
          {value === undefined ? "–" : fmt.whzd(value)} <span className="text-sm font-semibold text-white/70">WHZD</span>
        </span>
        <span className="min-h-lh text-[13px] text-white/60">{note}</span>
      </dd>
    </div>
  );
}

/** Whether you can open a request right now, and what to do if not. */
function CanRequest() {
  const { t } = useI18n();
  const copy = t.dashboard.canRequest;
  const eligibility = useEligibility();
  const { icon, title, text, href, cta } = !eligibility
    ? { icon: null, title: copy.title, text: copy.checking, href: null, cta: null }
    : eligibility.can
      ? { icon: <Check className="size-4.5" strokeWidth={2.5} />, ...copy.can, href: "/ask" }
      : eligibility.reason === "running"
        ? { icon: <Hourglass className="size-4.5" />, ...copy.running, href: `/requests/${eligibility.requestId}` }
        : { icon: <HandHeart className="size-4.5" />, ...copy.helpFirst, href: "/requests" };
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/8 px-4 py-3.5">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          eligibility?.can ? "bg-kunyit text-pandan-deep" : "bg-white/15 text-white",
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-[13px] leading-snug text-white/70">{text}</span>
      </div>
      {href && (
        <Link href={href} className="pressable flex shrink-0 items-center gap-1 text-sm font-semibold text-kunyit">
          {cta}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </div>
  );
}

function RefundNotice() {
  const config = useConfig();
  const { t, fmt } = useI18n();
  const { data } = useRefunds();
  const tx = useTx();
  if (!data || data.refunds.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {data.refunds.map((refund) => (
        <div key={refund.requestId} className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl bg-kunyit-soft px-6 py-5 text-kunyit-ink">
          <RotateCcw aria-hidden="true" className="size-5" />
          <p className="min-w-72 flex-1">
            {t.dashboard.refund.body(
              <Link href={`/requests/${refund.requestId}`} className="font-semibold underline underline-offset-4">
                {t.common.request(Number(refund.requestId))}
              </Link>,
              <strong className="tabular">{fmt.whzd(refund.amount)} WHZD</strong>,
            )}
          </p>
          <Button
            disabled={tx.busy}
            onClick={() =>
              void tx.run({
                prompt: {
                  title: t.common.claimBack(fmt.whzd(refund.amount)),
                  detail: t.wallet.call("Escrow", "claimRefund", t.common.refundDetail),
                },
                send: () =>
                  writeContract(config, { ...escrow, functionName: "claimRefund", args: [BigInt(refund.requestId)] }),
                success: t.dashboard.refund.success(fmt.whzd(refund.amount)),
                invalidate: [keys.refunds, keys.anyMember],
              })
            }
          >
            <TxLabel tx={tx}>{t.common.claimBack(fmt.whzd(refund.amount))}</TxLabel>
          </Button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- lists

type SectionTitleProps = {
  id: string;
  children: React.ReactNode;
  description: string;
  action?: React.ReactNode;
};

function SectionTitle(props: SectionTitleProps) {
  const { id, children, description, action } = props;
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="text-[25px] leading-tight font-extrabold">
          {children}
        </h2>
        <p className="text-sm text-batu">{description}</p>
      </div>
      {action}
    </div>
  );
}

// Waiting for your answer first, then the ones you passed on (you can still help), then the ones you
// already helped, then the ones whose time is up and whose money is on its way. A request stays here
// until the money has actually arrived, whatever you answered.
const answerOrder = { pending: 0, participating: 0, declined: 1, contributed: 2 } as const;
const order = (r: Request) => (r.awaitingFinalize ? 3 : answerOrder[r.yourResponse!]);

function Waiting() {
  const { t } = useI18n();
  const text = t.dashboard.waiting;
  const { data, isPending } = useRequests("for-me");
  const live = (data ?? [])
    .filter((r) => isOpen(r) && r.yourResponse)
    .sort((a, b) => order(a) - order(b) || byDeadline(a, b));
  const waiting = live.filter((r) => order(r) === 0).length;
  return (
    <section aria-labelledby="waiting" className="flex flex-col gap-4">
      <SectionTitle
        id="waiting"
        action={
          live.length > 0 && (
            <span className="text-sm font-semibold text-batu">
              {waiting ? text.count(waiting) : text.allAnswered}
            </span>
          )
        }
        description={text.description}
      >
        {text.title}
      </SectionTitle>
      {isPending ? (
        <ul className="flex">
          <RequestCardSkeleton />
        </ul>
      ) : live.length === 0 ? (
        <EmptyState icon={<Users className="size-6" />} title={text.emptyTitle}>
          {text.emptyBody}
        </EmptyState>
      ) : (
        <Carousel label={text.carousel}>
          {live.map((r) => (
            <RequestCard key={r.id} request={r} className="w-full shrink-0 snap-start" />
          ))}
        </Carousel>
      )}
    </section>
  );
}

type RequesterProps = {
  request: Request;
  mine?: boolean;
};

function Requester(props: RequesterProps) {
  const { request: r, mine } = props;
  const { t } = useI18n();
  const profile = useProfile(r.requester);
  return (
    <div className="flex items-center gap-3">
      <Avatar address={r.requester} profile={profile} className="size-11 text-sm" />
      <div className="flex flex-col leading-snug">
        <span className="font-semibold">{mine ? t.common.you : callName(profile, shortAddress(r.requester))}</span>
        {profile?.city && <span className="text-sm text-batu">{profile.city}</span>}
      </div>
    </div>
  );
}

type RequestCardProps = {
  request: Request;
  mine?: boolean;
  className?: string;
};

/**
 * A running request on the dashboard. The same card for requests you can help with and your own
 * (`mine`), so both read alike; only the footer differs: your answer, or where your money goes.
 */
function RequestCard(props: RequestCardProps) {
  const { request: r, mine, className } = props;
  const { t, fmt } = useI18n();
  const requester = useProfile(r.requester);
  const answer = r.yourResponse;
  const sending = r.awaitingFinalize;
  const open = !mine && !sending && (answer === "pending" || answer === "participating");
  return (
    <li
      className={cn("flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-6", open && "border-kunyit/60", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Requester request={r} mine={mine} />
        {sending ? <StatusBadge request={r} /> : <CountdownPill deadline={r.deadline} />}
      </div>
      <div className="flex flex-col gap-1.5">
        <Link href={`/requests/${r.id}`} className="text-xl leading-snug font-bold text-balance hover:underline">
          {r.title ?? t.common.request(r.id)}
        </Link>
        {r.description && <p className="line-clamp-1 leading-relaxed text-batu">{r.description}</p>}
      </div>
      <FundingProgress request={r} className="rounded-xl bg-embun p-4" />
      {mine ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5.5">
          <span className="flex min-w-0 items-center gap-1.5 text-sm text-batu">
            <Send aria-hidden="true" className="size-4 shrink-0" />
            {sending ? t.dashboard.card.sendingToYou : t.dashboard.card.autoToYou}
          </span>
          <Link href={`/requests/${r.id}`} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-pandan">
            {t.common.seeHistory}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : open ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href={`/requests/${r.id}`} className={cn(buttonVariants(), "tabular w-full sm:w-auto")}>
            {t.common.help(fmt.whzd(r.share))}
          </Link>
          <DeclineButton id={r.id} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <YourAnswer request={r} />
            {sending ? (
              <span className="flex items-center gap-1.5 text-sm text-batu">
                <Send aria-hidden="true" className="size-4 shrink-0" />
                {t.dashboard.card.sendingTo(callName(requester, shortAddress(r.requester)))}
              </span>
            ) : (
              answer === "declined" && <span className="text-sm text-batu">{t.dashboard.card.canStillHelp}</span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

type RequestCardSkeletonProps = {
  mine?: boolean;
};

/** RequestCard while the list loads, row for row; `mine` picks the footer, as on the real card. */
function RequestCardSkeleton(props: RequestCardSkeletonProps) {
  const { mine } = props;
  return (
    <li aria-hidden="true" className="flex w-full shrink-0 flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex flex-col leading-snug">
            <SkeletonText className="w-28" />
            <SkeletonText className="w-20 text-sm" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="flex flex-col gap-1.5">
        <SkeletonText className="w-3/4 text-xl leading-snug font-bold" />
        <SkeletonText className="w-full leading-relaxed" />
      </div>
      <FundingProgressSkeleton className="rounded-xl bg-embun p-4" />
      {mine ? (
        <div className="flex items-center justify-between gap-3 border-t pt-5.5">
          <SkeletonText className="w-48 text-sm" />
          <SkeletonText className="w-24 text-sm" />
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Skeleton className="h-11 w-full rounded-full sm:w-44" />
          <Skeleton className="h-11 w-full rounded-full sm:w-32" />
        </div>
      )}
    </li>
  );
}

type DeclineButtonProps = {
  id: number;
};

function DeclineButton(props: DeclineButtonProps) {
  const { id } = props;
  const { t } = useI18n();
  const decline = useDecline(id, t.dashboard.declined.description);
  return (
    <Button variant="ghost" disabled={decline.isPending} className="w-full sm:w-auto" onClick={() => decline.mutate()}>
      <BusyLabel busy={decline.isPending ? t.common.saving : null}>{t.common.notThisTime}</BusyLabel>
    </Button>
  );
}

function MyRequests() {
  const { t } = useI18n();
  const text = t.dashboard.mine;
  const { data, isPending } = useRequests("mine");
  // Waiting to be sent still counts as running for the requester: the money hasn't arrived yet.
  // Finished ones live on the requests page; the dashboard only shows what is still under way.
  const live = (data ?? []).filter(isOpen);
  const finished = (data?.length ?? 0) - live.length;
  return (
    <section aria-labelledby="mine" className="flex flex-col gap-4">
      <SectionTitle
        id="mine"
        description={text.description}
        action={
          finished > 0 && (
            <Link href="/requests" className="text-sm font-semibold text-pandan underline underline-offset-4">
              {text.history}
            </Link>
          )
        }
      >
        {text.title}
      </SectionTitle>
      {isPending ? (
        <ul className="flex flex-col gap-4">
          <RequestCardSkeleton mine />
        </ul>
      ) : live.length === 0 ? (
        <EmptyState
          icon={<HandHeart className="size-6" />}
          title={finished > 0 ? text.noneRunning : text.never}
          action={
            <Link href="/ask" className={buttonVariants({ variant: "outline" })}>
              {t.common.askForHelp}
            </Link>
          }
        >
          {text.emptyBody}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {live.map((r) => (
            <RequestCard key={r.id} request={r} mine />
          ))}
        </ul>
      )}
    </section>
  );
}

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

/** An empty section: centred and roomy, so it reads as a calm placeholder rather than a cramped row. */
function EmptyState(props: EmptyStateProps) {
  const { icon, title, action, children } = props;
  return (
    <div className="flex min-h-91.25 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-pandan-soft text-pandan">
        {icon}
      </span>
      <div className="flex max-w-[36ch] flex-col gap-1.5">
        <span className="text-lg font-bold">{title}</span>
        <p className="leading-relaxed text-pretty text-batu">{children}</p>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

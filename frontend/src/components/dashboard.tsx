"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, HandHeart, Hourglass, RotateCcw, Send, Users } from "lucide-react";
import { useConfig } from "wagmi";
import { writeContract } from "wagmi/actions";
import { toast } from "sonner";

import { Avatar, callName } from "@/components/avatar";
import { CountdownPill } from "@/components/countdown";
import { Carousel } from "@/components/carousel";
import { FundingProgress } from "@/components/funding";
import { MemberDirectory } from "@/components/member-directory";
import { isLive } from "@/components/request-row";
import { StatusBadge, YourAnswer } from "@/components/status-badge";
import { BusyLabel, TxLabel } from "@/components/tx-label";
import { TopUpDialog } from "@/components/top-up";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, type Member, type Request } from "@/lib/api";
import { escrow, registry } from "@/lib/contracts";
import { errorMessage } from "@/lib/errors";
import { shortAddress } from "@/lib/format";
import { type Dict, useI18n } from "@/lib/i18n";
import { keys, useEligibility, useMe, useMember, useMemberStats, useRefunds, useRequests } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { useTx } from "@/lib/tx";
import { cn } from "@/lib/utils";

function greeting(t: Dict): string {
  const hour = new Date().getHours();
  if (hour < 11) return t.dashboard.greeting.morning;
  if (hour < 15) return t.dashboard.greeting.noon;
  if (hour < 19) return t.dashboard.greeting.afternoon;
  return t.dashboard.greeting.evening;
}

export function Dashboard() {
  const { t } = useI18n();
  const { data: me } = useMe();
  if (!me) return null;
  const name = me.profile?.nickname ?? me.profile?.displayName?.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[39px] leading-tight font-extrabold text-pandan">
          {greeting(t)}
          {name ? `, ${name}` : ""}
        </h1>
        <Link href="/ajukan" className={buttonVariants({ variant: "outline" })}>
          {t.common.askForHelp}
        </Link>
      </div>
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

/** Shown until the profile and first top-up are done (Ready is a choice, so it doesn't count). */
function SetupBanner({ me }: { me: Member }) {
  const { t } = useI18n();
  const hasTokens = BigInt(me.chain.faucetClaimed) > 0n || BigInt(me.chain.balance) > 0n;
  if (me.profile?.displayName && hasTokens) return null;
  return (
    <Link
      href="/gabung"
      className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-dashed border-pandan/30 bg-card p-5 hover:border-pandan/60"
    >
      <div className="flex min-w-60 flex-1 flex-col gap-1">
        <span className="font-bold">{t.dashboard.setup.title}</span>
        <span className="text-batu">{t.dashboard.setup.body(!me.profile?.displayName)}</span>
      </div>
      <ArrowRight aria-hidden="true" className="size-5 text-pandan" />
    </Link>
  );
}

// ---------------------------------------------------------------- wallet

/** Balance, what has moved through it, and whether new requests count you in: one card. */
function Wallet({ me }: { me: Member }) {
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
    <section aria-label={t.dashboard.wallet.label} className="flex flex-col gap-6 rounded-3xl bg-pandan-deep p-6 text-white sm:p-7">
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
          {/* {st && BigInt(st.refunded) > 0n && (
            <p className="col-span-2 pt-2 text-[13px] text-white/60">
              {t.dashboard.wallet.refunded(<span className="tabular">{fmt.whzd(st.refunded)} WHZD</span>)}
            </p>
          )} */}
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

/** A total on the balance card; a placeholder until (or if) the totals load. */
function Figure({ label, value, note }: { label: string; value?: string; note?: string | false }) {
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
      ? { icon: <Check className="size-4.5" strokeWidth={2.5} />, ...copy.can, href: "/ajukan" }
      : eligibility.reason === "running"
        ? { icon: <Hourglass className="size-4.5" />, ...copy.running, href: `/permintaan/${eligibility.requestId}` }
        : { icon: <HandHeart className="size-4.5" />, ...copy.helpFirst, href: "/permintaan" };
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
              <Link href={`/permintaan/${refund.requestId}`} className="font-semibold underline underline-offset-4">
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
                invalidate: [keys.refunds, ["member"]],
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

function SectionTitle({
  id,
  children,
  description,
  action,
}: {
  id: string;
  children: React.ReactNode;
  description: string;
  action?: React.ReactNode;
}) {
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
    .filter((r) => (isLive(r) || r.awaitingFinalize) && r.yourResponse)
    .sort((a, b) => order(a) - order(b) || new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
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
        <Skeleton className="h-40 w-full rounded-3xl" />
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

function Requester({ request: r, mine }: { request: Request; mine?: boolean }) {
  const { t } = useI18n();
  const { data: member } = useMember(r.requester);
  const profile = member?.profile;
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

/**
 * A running request on the dashboard. The same card for requests you can help with and your own
 * (`mine`), so both read alike; only the footer differs: your answer, or where your money goes.
 */
function RequestCard({ request: r, mine, className }: { request: Request; mine?: boolean; className?: string }) {
  const { t, fmt } = useI18n();
  const { token: session } = useSession();
  const { data: requester } = useMember(r.requester);
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
        <Link href={`/permintaan/${r.id}`} className="text-xl leading-snug font-bold text-balance hover:underline">
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
          <Link href={`/permintaan/${r.id}`} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-pandan">
            {t.common.seeHistory}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : open ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href={`/permintaan/${r.id}`} className={cn(buttonVariants(), "tabular w-full sm:w-auto")}>
            {t.common.help(fmt.whzd(r.share))}
          </Link>
          <DeclineButton id={r.id} token={session} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <YourAnswer request={r} />
            {sending ? (
              <span className="flex items-center gap-1.5 text-sm text-batu">
                <Send aria-hidden="true" className="size-4 shrink-0" />
                {t.dashboard.card.sendingTo(callName(requester?.profile, shortAddress(r.requester)))}
              </span>
            ) : (
              answer === "declined" && <span className="text-sm text-batu">{t.dashboard.card.canStillHelp}</span>
            )}
          </div>
          {/* <Link href={`/permintaan/${r.id}`} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-pandan">
            {answer === "declined" && !sending ? t.common.help(fmt.whzd(r.share)) : t.common.seeHistory}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link> */}
        </div>
      )}
    </li>
  );
}

function DeclineButton({ id, token }: { id: number; token: string | null }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      disabled={busy}
      className="w-full sm:w-auto"
      onClick={async () => {
        setBusy(true);
        try {
          await api.respond(token!, id, "decline");
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["requests"] }),
            queryClient.invalidateQueries({ queryKey: keys.request(id) }),
            queryClient.invalidateQueries({ queryKey: ["member"] }),
          ]);
          toast(t.common.declinedToast, { description: t.dashboard.declined.description });
        } catch (error) {
          toast.error(errorMessage(error, t));
          setBusy(false);
        }
      }}
    >
      <BusyLabel busy={busy ? t.common.saving : null}>{t.common.notThisTime}</BusyLabel>
    </Button>
  );
}

function MyRequests() {
  const { t } = useI18n();
  const text = t.dashboard.mine;
  const { data, isPending } = useRequests("mine");
  // Waiting to be sent still counts as running for the requester: the money hasn't arrived yet.
  // Finished ones live on the Permintaan page; the dashboard only shows what is still under way.
  const live = (data ?? []).filter((r) => isLive(r) || r.awaitingFinalize);
  const finished = (data?.length ?? 0) - live.length;
  return (
    <section aria-labelledby="mine" className="flex flex-col gap-4">
      <SectionTitle
        id="mine"
        description={text.description}
        action={
          finished > 0 && (
            <Link href="/permintaan" className="text-sm font-semibold text-pandan underline underline-offset-4">
              {text.history}
            </Link>
          )
        }
      >
        {text.title}
      </SectionTitle>
      {isPending ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : live.length === 0 ? (
        <EmptyState
          icon={<HandHeart className="size-6" />}
          title={finished > 0 ? text.noneRunning : text.never}
          action={
            <Link href="/ajukan" className={buttonVariants({ variant: "outline" })}>
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

/** An empty section: centred and roomy, so it reads as a calm placeholder rather than a cramped row. */
function EmptyState({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
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

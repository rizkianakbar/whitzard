"use client";

import { Fragment, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  FilePlus,
  FileText,
  HeartHandshake,
  History as HistoryIcon,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { Address } from "viem";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/features/members/member-avatar";
import { useProfile } from "@/features/members/members.hooks";
import { callName } from "@/features/members/members.lib";
import { Actions } from "@/features/request-detail/request-actions";
import {
  COMMENT_MAX,
  commentLength,
  commentSchema,
  type CommentValues,
  sha256Hex,
} from "@/features/request-detail/request-detail.lib";
import { useActivity, useRequest } from "@/features/requests/requests.hooks";
import { FundingProgress, FundingProgressSkeleton } from "@/features/requests/funding-progress";
import { ShareGrid, ShareLegend } from "@/features/requests/share-grid";
import { StatusBadge } from "@/features/requests/request-status";
import { useSession } from "@/features/session/session.hooks";
import { BusyLabel } from "@/features/tx/tx-label";
import { AddressLink, TxProof } from "@/features/tx/tx-proof";
import { api, ApiError, type RequestComment, type RequestDetail as Detail } from "@/lib/api";
import { appConfig, chain } from "@/lib/config";
import { escrow } from "@/lib/contracts";
import { errorMessage } from "@/lib/errors";
import { shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import { keys } from "@/lib/query-keys";
import { useObjectUrl } from "@/lib/use-object-url";
import { cn } from "@/lib/utils";

type RequestDetailProps = {
  id: number;
};

export function RequestDetail(props: RequestDetailProps) {
  const { id } = props;
  const { t } = useI18n();
  const { data, error, isPending } = useRequest(id);
  if (isPending) return <RequestDetailSkeleton />;
  if (error) {
    return (
      <div className="flex max-w-xl flex-col gap-3 rounded-3xl border bg-card p-8">
        <h1 className="text-xl font-semibold">{t.request.notFound}</h1>
        <p className="text-batu">
          {error instanceof ApiError && error.status === 404 ? t.request.notFoundYet : errorMessage(error, t)}
        </p>
        <Link href="/requests" className="font-semibold underline underline-offset-4">
          {t.request.all}
        </Link>
      </div>
    );
  }
  return <View detail={data} />;
}

type RequestPrefetchProps = {
  id: number;
};

/** Starts loading the request while something else (the member check) is still pending. Renders nothing. */
export function RequestPrefetch(props: RequestPrefetchProps) {
  const { id } = props;
  useRequest(id);
  useActivity(id);
  return null;
}

/** The request page before the request has loaded: View's layout, card for card. */
export function RequestDetailSkeleton() {
  const { t } = useI18n();
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/requests"
          className="pressable -ml-1.5 flex items-center gap-1 self-start rounded-full px-1.5 py-1 text-sm font-semibold text-batu hover:text-pandan"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.request.back}
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SkeletonText className="w-80 text-[32px] leading-[1.1] font-extrabold sm:text-[39px]" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="flex min-w-0 items-center gap-2.5 text-sm">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <SkeletonText className="w-56" />
        </div>
      </header>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
          <section className="order-1 flex flex-col gap-6 rounded-2xl border bg-card p-6 sm:p-7">
            <FundingProgressSkeleton size="lg" />
            <div className="flex flex-col gap-4 rounded-xl bg-embun p-4 sm:p-5">
              <div aria-hidden="true" className="grid grid-cols-[repeat(auto-fill,minmax(32px,44px))] gap-2">
                {Array.from({ length: 10 }, (_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-[10px]" />
                ))}
              </div>
              <ShareLegend />
            </div>
            <div className="text-[13px] leading-relaxed">
              <SkeletonText className="w-full" />
              <SkeletonText className="w-1/2" />
            </div>
          </section>
          <PanelSkeleton className="order-3" lines={3} />
        </div>

        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
          <aside className="order-2 flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgb(23_48_42/0.04),0_12px_32px_-12px_rgb(23_48_42/0.12)]">
            <Skeleton className="size-11 rounded-full" />
            <SkeletonText className="w-3/4 text-xl font-bold" />
            <div className="leading-relaxed">
              <SkeletonText className="w-full" />
              <SkeletonText className="w-full" />
              <SkeletonText className="w-2/3" />
            </div>
          </aside>
          <PanelSkeleton className="order-4" lines={2} />
        </div>
      </div>
    </div>
  );
}

type PanelSkeletonProps = {
  lines: number;
  className?: string;
};

/** A Panel with its header and a few lines of body greyed out. */
function PanelSkeleton(props: PanelSkeletonProps) {
  const { lines, className } = props;
  return (
    <section aria-hidden="true" className={cn("flex flex-col gap-5 rounded-2xl border bg-card p-6 sm:p-7", className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5">
          <SkeletonText className="w-40 text-lg leading-tight font-bold" />
          <SkeletonText className="w-3/4 text-sm leading-relaxed" />
        </div>
      </div>
      <div className="text-[17px] leading-[1.75]">
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonText key={i} className={i === lines - 1 ? "w-2/3" : "w-full"} />
        ))}
      </div>
    </section>
  );
}

type ViewProps = {
  detail: Detail;
};

function View(props: ViewProps) {
  const { detail } = props;
  const { t, fmt } = useI18n();
  const { request: r, responses, you } = detail;
  const requester = useProfile(r.requester);
  const [justContributed, setJustContributed] = useState(false);
  const name = callName(requester, shortAddress(r.requester));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/requests"
          className="pressable -ml-1.5 flex items-center gap-1 self-start rounded-full px-1.5 py-1 text-sm font-semibold text-batu hover:text-pandan"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.request.back}
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="max-w-[24ch] text-[32px] leading-[1.1] font-extrabold text-pandan sm:text-[39px]">
            {r.title ?? t.common.request(r.id)}
          </h1>
          <StatusBadge request={r} />
        </div>
        <div className="flex min-w-0 items-center gap-2.5 text-sm text-batu">
          <Avatar address={r.requester} profile={requester} className="size-7 text-[11px]" />
          <span className="min-w-0 truncate">
            <span className="font-semibold text-arang">{name}</span>
            {requester?.city && <> · {requester.city}</>} ·{" "}
            <time dateTime={r.openedAt} title={fmt.date(r.openedAt)}>
              {fmt.dayMonthYear(r.openedAt)}
            </time>
          </span>
        </div>
      </header>

      {/* Phones read top to bottom: what's collected, then what you can do, then the details, then the
          history. On wide screens the request sits on the left and its status on the right; both columns
          dissolve (display: contents) on phones so their cards can take part in that single order. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
          <section aria-labelledby="grid" className="order-1 flex flex-col gap-6 rounded-2xl border bg-card p-6 sm:p-7">
            <h2 id="grid" className="sr-only">
              {t.request.collected}
            </h2>
            <FundingProgress request={r} size="lg" />
            <div className="flex flex-col gap-4 rounded-xl bg-embun p-4 sm:p-5">
              <ShareGrid
                size={r.snapshotSize}
                contributed={responses.contributed}
                declined={responses.declined}
                you={you?.inSnapshot ? you.response : null}
                justContributed={justContributed}
              />
              <ShareLegend />
            </div>
            <p className="text-[13px] leading-relaxed text-batu">{t.request.gridNote(fmt.whzd(r.share), r.snapshotSize, name)}</p>
          </section>

          {r.description && (
            <Panel id="story" icon={<BookOpen className="size-4.5" />} title={t.request.story(name)} className="order-3">
              <p className="max-w-[65ch] text-[17px] leading-[1.75] whitespace-pre-line">{r.description}</p>
            </Panel>
          )}

          <Evidence detail={detail} requesterName={name} />
          <Discussion detail={detail} />
        </div>

        {/* Right column: where the request stands. Actions first, then what has happened so far. */}
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
          <aside
            aria-label={t.request.actions}
            className="order-2 flex min-w-0 flex-col gap-6 rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgb(23_48_42/0.04),0_12px_32px_-12px_rgb(23_48_42/0.12)]"
          >
            <Actions detail={detail} requesterName={name} onContributed={() => setJustContributed(true)} />
          </aside>
          <History detail={detail} requesterName={name} />
        </div>
      </div>
    </div>
  );
}

type PanelProps = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** One card style for every section of the page: same border, padding and header. */
function Panel(props: PanelProps) {
  const { id, icon, title, description, className, children } = props;
  return (
    <section aria-labelledby={id} className={cn("order-3 flex flex-col gap-5 rounded-2xl border bg-card p-6 sm:p-7", className)}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-pandan-soft text-pandan">
          {icon}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5 pt-1.5">
          <h2 id={id} className="text-lg leading-tight font-bold">
            {title}
          </h2>
          {description && <p className="text-sm leading-relaxed text-batu">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- evidence

type EvidenceProps = {
  detail: Detail;
  requesterName: string;
};

function Evidence(props: EvidenceProps) {
  const { detail, requesterName } = props;
  const { t } = useI18n();
  const text = t.request.evidence;
  const { token: session } = useSession();
  const r = detail.request;
  const allowed = detail.you?.isRequester || detail.you?.inSnapshot;

  // Fetch, then check the SHA-256 against the hash recorded on-chain before offering the document.
  // Opening it is a separate, direct click on a link, so popup blockers never get in the way.
  const verify = useMutation({
    mutationFn: async () => {
      const blob = await api.evidence(session!, r.id);
      return { blob, matches: (await sha256Hex(blob)) === r.evidenceHash.toLowerCase() };
    },
  });
  const url = useObjectUrl(verify.data?.blob);
  const check = verify.isPending ? "loading" : verify.data ? (verify.data.matches ? "match" : "mismatch") : "idle";

  return (
    <Panel
      id="evidence"
      icon={<FileText className="size-4.5" />}
      title={text.title}
      description={allowed ? text.allowed(requesterName) : text.restricted(requesterName)}
    >
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-embun p-4">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
            check === "match" ? "bg-daun-soft text-daun-ink" : check === "mismatch" ? "bg-bata-soft text-bata-ink" : "bg-card text-batu",
          )}
        >
          {check === "match" ? (
            <ShieldCheck className="size-5" />
          ) : check === "mismatch" ? (
            <TriangleAlert className="size-5" />
          ) : (
            <FileText className="size-5" />
          )}
        </span>
        <div className="flex min-w-48 flex-1 flex-col gap-0.5" aria-live="polite">
          <span className="font-semibold">{r.hasEvidence ? text.document : text.unavailable}</span>
          {check === "match" && <span className="text-[13px] text-daun-ink">{text.match}</span>}
          {check === "mismatch" && <span className="text-[13px] text-bata-ink">{text.mismatch}</span>}
          {(check === "idle" || check === "loading") && (
            <span className="tabular text-[13px] text-batu">{text.fingerprint(shortAddress(r.evidenceHash))}</span>
          )}
        </div>
        {r.hasEvidence && allowed && !url && (
          <Button variant="outline" disabled={check === "loading"} className="w-full bg-card sm:w-auto" onClick={() => verify.mutate()}>
            <BusyLabel busy={check === "loading" ? text.checking : null}>{text.check}</BusyLabel>
          </Button>
        )}
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", className: "w-full bg-card sm:w-auto" })}>
            {text.open}
            <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </a>
        )}
      </div>
      <p className="text-[13px] leading-relaxed text-batu">{text.note}</p>
    </Panel>
  );
}

// ---------------------------------------------------------------- discussion

const COMMENTS_PREVIEW = 5;

type DiscussionProps = {
  detail: Detail;
};

function Discussion(props: DiscussionProps) {
  const { detail } = props;
  const { t } = useI18n();
  const text = t.request.discussion;
  const { token: session, address: me } = useSession();
  const myProfile = useProfile(me);
  const queryClient = useQueryClient();
  const now = useNow();
  const [showAll, setShowAll] = useState(false);
  const { id, requester } = detail.request;
  // Oldest first, like a conversation; long threads start collapsed to the latest few.
  const comments = detail.comments ?? [];
  const shown = showAll ? comments : comments.slice(-COMMENTS_PREVIEW);

  const { register, control, handleSubmit, reset, formState } = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  });
  const length = commentLength(useWatch({ control, name: "body" }));
  const post = useMutation({
    mutationFn: (values: CommentValues) => api.comment(session!, id, values.body),
    onSuccess: (comment) => {
      // Add it to the cached request instead of refetching the whole page.
      queryClient.setQueriesData<Detail>({ queryKey: keys.request(id) }, (old) =>
        old && !old.comments?.some((c) => c.id === comment.id) ? { ...old, comments: [...(old.comments ?? []), comment] } : old,
      );
      reset();
      toast.success(text.posted);
    },
  });
  const submit = handleSubmit((values) => post.mutate(values));
  const sending = post.isPending;

  return (
    <Panel
      id="discussion"
      icon={<MessageCircle className="size-4.5" />}
      title={comments.length ? `${text.title} (${comments.length})` : text.title}
      description={text.description}
      className="order-4"
    >
      <form className="flex gap-3" onSubmit={submit}>
        <Avatar address={me} profile={myProfile} className="mt-1 size-9 shrink-0 text-[12px] max-sm:hidden" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Textarea
            maxLength={COMMENT_MAX}
            rows={3}
            className="min-h-24"
            placeholder={text.placeholder}
            aria-label={text.placeholder}
            readOnly={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (!sending) void submit();
              }
            }}
            {...register("body")}
          />
          <div className="flex items-center justify-between gap-3">
            <span className={cn("text-xs text-batu tabular", length > COMMENT_MAX - 100 && "font-semibold text-arang")}>
              {length > COMMENT_MAX - 200 ? `${length}/${COMMENT_MAX}` : text.shortcut}
            </span>
            <Button type="submit" disabled={sending || !formState.isValid}>
              <BusyLabel busy={sending ? text.sending : null}>{text.send}</BusyLabel>
            </Button>
          </div>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="border-t pt-5 text-sm text-batu">{text.empty}</p>
      ) : (
        <div className="flex flex-col gap-3 border-t pt-4">
          {comments.length > COMMENTS_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="pressable self-start rounded-full px-1 font-semibold text-pandan underline underline-offset-4"
            >
              {showAll ? t.common.showLess : t.common.showAll(comments.length)}
            </button>
          )}
          <ol className="flex flex-col divide-y">
            {shown.map((comment) => (
              <CommentItem key={comment.id} comment={comment} byRequester={comment.member === requester} now={now} />
            ))}
          </ol>
        </div>
      )}
    </Panel>
  );
}

type CommentItemProps = {
  comment: RequestComment;
  byRequester: boolean;
  now: number;
};

function CommentItem(props: CommentItemProps) {
  const { comment, byRequester, now } = props;
  const { t, fmt } = useI18n();
  const profile = useProfile(comment.member);
  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      <Avatar address={comment.member} profile={profile} className="size-9 shrink-0 text-[12px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <Who address={comment.member} />
          {byRequester && (
            <span className="rounded-full bg-pandan-soft px-2 py-0.5 text-[11px] font-bold text-pandan">{t.request.discussion.requester}</span>
          )}
          <time className="text-[13px] text-batu" dateTime={comment.createdAt} title={fmt.date(comment.createdAt)}>
            {now ? fmt.timeAgo(comment.createdAt, now) : fmt.stamp(comment.createdAt)}
          </time>
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{comment.body}</p>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- history

type Event = {
  key: string;
  icon: React.ReactNode;
  tone: string;
  /** Who took the step; their name leads the line. */
  who?: Address;
  text: React.ReactNode;
  when: string;
  tx: string | null;
};

// Past this many steps the middle contributions fold away; the opening and the latest steps stay.
const FOLD_AFTER = 6;
const KEEP_LAST = 3;

type HistoryProps = {
  detail: Detail;
  requesterName: string;
};

/**
 * Every on-chain step of this request, oldest first: opened, each contribution, a cancel and its
 * refunds, and the payout, each with its transaction so anyone can check it on the explorer. Who
 * declined or didn't answer is never named, only counted in the share grid.
 */
function History(props: HistoryProps) {
  const { detail, requesterName } = props;
  const { t, fmt } = useI18n();
  const text = t.request.history;
  const { request: r } = detail;
  const { data } = useActivity(r.id);
  const [unfolded, setUnfolded] = useState(false);

  const events: Event[] = [
    {
      key: "opened",
      icon: <FilePlus className="size-3.5" />,
      tone: "bg-pandan-soft text-pandan",
      who: r.requester,
      text: text.opened(<strong className="tabular">{fmt.whzd(r.amount)} WHZD</strong>),
      when: r.openedAt,
      tx: r.openedTx,
    },
  ];
  for (const a of data?.activity ?? []) {
    const helped = a.type === "contributed";
    events.push({
      key: `${a.type}-${a.member}`,
      icon: helped ? <HeartHandshake className="size-3.5" /> : <RotateCcw className="size-3.5" />,
      tone: helped ? "bg-kunyit-soft text-kunyit-ink" : "bg-muted text-batu",
      who: a.member,
      text: (helped ? text.helped : text.refunded)(<strong className="tabular">{fmt.whzd(a.amount)} WHZD</strong>),
      when: a.at,
      tx: a.txHash,
    });
  }
  if (r.cancelledAt && r.cancelledTx) {
    events.push({
      key: "cancelled",
      icon: <X className="size-3.5" />,
      tone: "bg-bata-soft text-bata-ink",
      who: r.requester,
      text: text.cancelled,
      when: r.cancelledAt,
      tx: r.cancelledTx,
    });
  }
  if (r.status === "finalized" && r.finalizedAt && r.finalizedTx) {
    events.push({
      key: "finalized",
      icon: <Check className="size-3.5" strokeWidth={2.5} />,
      tone: "bg-daun-soft text-daun-ink",
      text: text.finalized(<strong className="tabular">{fmt.whzd(r.collected)} WHZD</strong>, requesterName),
      when: r.finalizedAt,
      tx: r.finalizedTx,
    });
  } else if (r.status === "expired") {
    events.push({
      key: "expired",
      icon: <Clock className="size-3.5" />,
      tone: "bg-muted text-batu",
      text: text.expired,
      when: r.finalizedAt ?? r.deadline,
      tx: r.finalizedTx,
    });
  }
  events.sort((a, b) => Date.parse(a.when) - Date.parse(b.when));

  const folded = !unfolded && events.length > FOLD_AFTER ? events.length - 1 - KEEP_LAST : 0;
  const shown = folded ? [events[0], ...events.slice(-KEEP_LAST)] : events;

  return (
    <Panel
      id="history"
      icon={<HistoryIcon className="size-4.5" />}
      title={text.title}
      description={text.description(chain.name, !!appConfig.explorerUrl)}
      className="order-4"
    >
      <ol className="flex flex-col">
        {shown.map((e, i) => (
          <Fragment key={e.key}>
            <li className="relative flex gap-3 pb-4 last:pb-0">
              {i < shown.length - 1 && <span aria-hidden="true" className="absolute top-8 bottom-0.5 left-[13px] w-0.5 rounded-full bg-garis" />}
              <span aria-hidden="true" className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", e.tone)}>
                {e.icon}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                <span className="text-[15px] leading-snug">
                  {e.who && <Who address={e.who} />} {e.text}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-batu">
                  <time dateTime={e.when} title={fmt.date(e.when)}>
                    {fmt.stamp(e.when)}
                  </time>
                  {e.tx && <TxProof hash={e.tx} compact />}
                </span>
              </div>
            </li>
            {i === 0 && folded > 0 && (
              <li className="relative flex gap-3 pb-4">
                <span aria-hidden="true" className="absolute top-8 bottom-0.5 left-[13px] w-0.5 rounded-full bg-garis" />
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-garis text-[11px] font-bold text-batu">
                  +{folded}
                </span>
                <button type="button" onClick={() => setUnfolded(true)} className="pressable self-center text-[13px] font-semibold text-pandan">
                  {text.more(folded)}
                </button>
              </li>
            )}
          </Fragment>
        ))}
      </ol>
      <p className="border-t pt-4 text-[12px] leading-relaxed text-batu">
        {text.heldBy(<AddressLink address={escrow.address}>{shortAddress(escrow.address)}</AddressLink>)}
      </p>
    </Panel>
  );
}

type WhoProps = {
  address: Address;
};

/** A member's name in a history line: "Kamu" / "You" for the viewer. */
function Who(props: WhoProps) {
  const { address } = props;
  const { t } = useI18n();
  const { address: me } = useSession();
  const profile = useProfile(address);
  const mine = me?.toLowerCase() === address.toLowerCase();
  return <strong className="font-semibold">{mine ? t.common.you : callName(profile, shortAddress(address))}</strong>;
}

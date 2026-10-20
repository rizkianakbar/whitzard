"use client";

import { Fragment, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  FilePlus,
  FileText,
  Hand,
  HeartHandshake,
  History as HistoryIcon,
  Hourglass,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "wagmi";
import { readContract, signTypedData, writeContract } from "wagmi/actions";
import { type Address, bytesToHex, parseSignature } from "viem";

import { Avatar, callName } from "@/components/avatar";
import { CountdownPanel, useRemaining } from "@/components/countdown";
import { FundingProgress } from "@/components/funding";
import { ShareGrid, ShareLegend } from "@/components/share-grid";
import { StatusBadge } from "@/components/status-badge";
import { BusyLabel, TxLabel } from "@/components/tx-label";
import { TopUpDialog } from "@/components/top-up";
import { AddressLink, TxProof } from "@/components/tx-proof";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError, type RequestDetail as Detail } from "@/lib/api";
import { appConfig } from "@/lib/config";
import { escrow, token } from "@/lib/contracts";
import { errorMessage } from "@/lib/errors";
import { shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { keys, useActivity, useMe, useMember, useRequest } from "@/lib/queries";
import { useNow } from "@/lib/now";
import { useSession } from "@/lib/session";
import { useTx } from "@/lib/tx";
import { cn } from "@/lib/utils";
import { chain } from "@/lib/wagmi";

export function RequestDetail({ id }: { id: number }) {
  const { t } = useI18n();
  const { data, error, isPending } = useRequest(id);
  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (error) {
    return (
      <div className="flex max-w-xl flex-col gap-3 rounded-3xl border bg-card p-8">
        <h1 className="text-xl font-semibold">{t.request.notFound}</h1>
        <p className="text-batu">
          {error instanceof ApiError && error.status === 404 ? t.request.notFoundYet : errorMessage(error, t)}
        </p>
        <Link href="/permintaan" className="font-semibold underline underline-offset-4">
          {t.request.all}
        </Link>
      </div>
    );
  }
  return <View detail={data} />;
}

function View({ detail }: { detail: Detail }) {
  const { t, fmt } = useI18n();
  const { request: r, responses, you } = detail;
  const { data: requester } = useMember(r.requester);
  const [justContributed, setJustContributed] = useState(false);
  const name = callName(requester?.profile, shortAddress(r.requester));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/permintaan"
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
          <Avatar address={r.requester} profile={requester?.profile} className="size-7 text-[11px]" />
          <span className="min-w-0 truncate">
            <span className="font-semibold text-arang">{name}</span>
            {requester?.profile?.city && <> · {requester.profile.city}</>} ·{" "}
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

/** One card style for every section of the page: same border, padding and header. */
function Panel({
  id,
  icon,
  title,
  description,
  className,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
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

function Evidence({ detail, requesterName }: { detail: Detail; requesterName: string }) {
  const { t } = useI18n();
  const text = t.request.evidence;
  const { token: session } = useSession();
  const [check, setCheck] = useState<"idle" | "loading" | "match" | "mismatch">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const r = detail.request;
  const allowed = detail.you?.isRequester || detail.you?.inSnapshot;

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  // Fetch, then check the SHA-256 against the hash recorded on-chain before offering the document.
  // Opening it is a separate, direct click on a link, so popup blockers never get in the way.
  const fetchAndCheck = async () => {
    setCheck("loading");
    try {
      const { blob } = await api.evidence(session!, r.id);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
      setCheck(bytesToHex(digest) === r.evidenceHash.toLowerCase() ? "match" : "mismatch");
      setUrl(URL.createObjectURL(blob));
    } catch (error) {
      setCheck("idle");
      toast.error(errorMessage(error, t));
    }
  };

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
          <Button variant="outline" disabled={check === "loading"} className="w-full bg-card sm:w-auto" onClick={() => void fetchAndCheck()}>
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

/**
 * Every on-chain step of this request, oldest first: opened, each contribution, a cancel and its
 * refunds, and the payout, each with its transaction so anyone can check it on the explorer. Who
 * declined or didn't answer is never named, only counted in the share grid.
 */
function History({ detail, requesterName }: { detail: Detail; requesterName: string }) {
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
  events.sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());

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

/** A member's name in a history line: "Kamu" / "You" for the viewer. */
function Who({ address }: { address: Address }) {
  const { t } = useI18n();
  const { address: me } = useSession();
  const { data: member } = useMember(address);
  const mine = me?.toLowerCase() === address.toLowerCase();
  return <strong className="font-semibold">{mine ? t.common.you : callName(member?.profile, shortAddress(address))}</strong>;
}

// ---------------------------------------------------------------- actions

function Actions({ detail, requesterName, onContributed }: { detail: Detail; requesterName: string; onContributed: () => void }) {
  const { t, fmt } = useI18n();
  const { request: r, you } = detail;
  const remaining = useRemaining(r.deadline);
  const ended = remaining === 0;
  const open = (r.status === "open" || r.status === "funding") && !r.awaitingFinalize && !ended;

  if (r.status === "finalized") {
    return (
      <>
        <Summary icon={<Check className="size-5" strokeWidth={2.5} />} tone="daun" title={t.request.finalized.title}>
          {t.request.finalized.body(
            <strong className="tabular">{fmt.whzd(r.collected)} WHZD</strong>,
            requesterName,
            r.finalizedAt ? fmt.date(r.finalizedAt) : null,
          )}
        </Summary>
        {r.finalizedTx && <TxProof hash={r.finalizedTx} label={t.request.finalized.proof} className="px-3 py-1.5 text-[13px]" />}
      </>
    );
  }
  if (r.status === "expired") {
    return (
      <Summary icon={<Clock className="size-5" />} tone="muted" title={t.request.expired.title}>
        {t.request.expired.body}
      </Summary>
    );
  }
  if (r.status === "cancelled") return <Cancelled detail={detail} requesterName={requesterName} />;
  if (r.awaitingFinalize || ended) return <AwaitingFinalize detail={detail} requesterName={requesterName} />;

  if (you?.isRequester) return <RequesterPanel detail={detail} />;
  if (!you?.inSnapshot) {
    return (
      <Summary icon={<UserRound className="size-5" />} tone="muted" title={t.request.notIncluded.title}>
        {t.request.notIncluded.body}
      </Summary>
    );
  }
  if (you.response === "contributed") {
    return (
      <>
        <Summary icon={<HeartHandshake className="size-5" />} tone="daun" title={t.request.contributed.title}>
          {t.request.contributed.body(<strong className="tabular">{fmt.whzd(r.share)} WHZD</strong>, requesterName)}
        </Summary>
        <CountdownPanel openedAt={r.openedAt} deadline={r.deadline} />
      </>
    );
  }
  return open ? <ContributePanel detail={detail} requesterName={requesterName} onContributed={onContributed} /> : null;
}

const tones = {
  pandan: "bg-pandan-soft text-pandan",
  daun: "bg-daun-soft text-daun-ink",
  muted: "bg-muted text-batu",
  bata: "bg-bata-soft text-bata-ink",
} as const;

function Summary({
  title,
  icon,
  tone = "pandan",
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: keyof typeof tones;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {icon && (
        <span aria-hidden="true" className={cn("flex size-11 items-center justify-center rounded-full", tones[tone])}>
          {icon}
        </span>
      )}
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="leading-relaxed text-batu">{children}</p>
    </div>
  );
}

const permitTypes = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

function ContributePanel({
  detail,
  requesterName,
  onContributed,
}: {
  detail: Detail;
  requesterName: string;
  onContributed: () => void;
}) {
  const config = useConfig();
  const { t, fmt } = useI18n();
  const text = t.request.contribute;
  const queryClient = useQueryClient();
  const [declining, setDeclining] = useState(false);
  const { address, token: session } = useSession();
  const { data: me } = useMe();
  const tx = useTx();
  const { request: r, you } = detail;
  const id = BigInt(r.id);
  const share = BigInt(r.share);
  const enough = me ? BigInt(me.chain.balance) >= share : true;

  const contribute = async () => {
    // Recording the intent is a courtesy for the requester; the chain decides.
    void api.respond(session!, r.id, "participate").catch(() => undefined);
    const amount = fmt.whzd(r.share);
    const contributeStep = (fn: string) => ({
      title: text.prompt(amount),
      detail: t.wallet.call("Escrow", fn, text.detail(requesterName)),
    });
    const receipt = await tx.run({
      prompt: contributeStep("contribute"),
      send: async (step) => {
        const allowance = await readContract(config, { ...token, functionName: "allowance", args: [address!, escrow.address] });
        if (allowance >= share) return writeContract(config, { ...escrow, functionName: "contribute", args: [id] });
        // One transaction: approve by signature (EIP-2612) inside the contribution.
        const [name, nonce] = await Promise.all([
          readContract(config, { ...token, functionName: "name" }),
          readContract(config, { ...token, functionName: "nonces", args: [address!] }),
        ]);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        step({ title: text.permit(amount), detail: text.permitDetail(amount) });
        const signature = await signTypedData(config, {
          domain: { name, version: "1", chainId: chain.id, verifyingContract: token.address },
          types: permitTypes,
          primaryType: "Permit",
          message: { owner: address!, spender: escrow.address, value: share, nonce, deadline },
        });
        const { v, r: sigR, s } = parseSignature(signature);
        step({ ...contributeStep("contributeWithPermit"), title: text.promptStep2(amount) });
        return writeContract(config, {
          ...escrow,
          functionName: "contributeWithPermit",
          args: [id, deadline, Number(v ?? 27n), sigR, s],
        });
      },
      synced: async () => (await api.request(r.id, session)).you?.response === "contributed",
      success: text.success(amount),
      invalidate: [keys.request(r.id), ["requests"], ["member"]],
    });
    if (receipt) onContributed();
  };

  // The answer is recorded off-chain; refetching makes the page (and the grid) show it right away.
  const decline = async () => {
    setDeclining(true);
    try {
      await api.respond(session!, r.id, "decline");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.request(r.id) }),
        queryClient.invalidateQueries({ queryKey: ["requests"] }),
        queryClient.invalidateQueries({ queryKey: ["member"] }),
      ]);
      toast(t.common.declinedToast);
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setDeclining(false);
    }
  };
  const declined = you?.response === "declined";

  return (
    <>
      {declined ? (
        <div key="declined" className="settle-in flex flex-col gap-3">
          <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-muted text-batu">
            <Hand className="size-5" />
          </span>
          <h2 className="text-xl font-bold">{text.declinedTitle}</h2>
          <p className="leading-relaxed text-batu">
            {text.declinedBody(<strong className="tabular text-arang">{fmt.whzd(r.share)} WHZD</strong>)}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-batu">{text.yourShare}</span>
          <span className="tabular text-[49px] leading-none font-extrabold tracking-tighter">
            {fmt.whzd(r.share)} <span className="text-xl font-semibold tracking-normal">WHZD</span>
          </span>
          <span className="text-[13px] leading-relaxed text-batu">
            {text.sameForAll(fmt.whzd(r.amount), r.snapshotSize)}
          </span>
        </div>
      )}
      <CountdownPanel openedAt={r.openedAt} deadline={r.deadline} />
      <div className="flex flex-col gap-2.5">
        <Button
          size="lg"
          variant={declined ? "outline" : "default"}
          className="tabular"
          disabled={tx.busy || declining || !enough}
          onClick={() => void contribute()}
        >
          <TxLabel tx={tx}>{t.common.help(fmt.whzd(r.share))}</TxLabel>
        </Button>
        {!declined && (
          <Button variant="ghost" disabled={tx.busy || declining} onClick={() => void decline()}>
            <BusyLabel busy={declining ? t.common.saving : null}>{t.common.notThisTime}</BusyLabel>
          </Button>
        )}
      </div>
      {!enough && me && (
        <div className="flex flex-col gap-2 rounded-2xl bg-bata-soft p-4 text-sm text-bata-ink">
          <p>{text.notEnough(fmt.whzd(me.chain.balance))}</p>
          <TopUpDialog
            me={me}
            trigger={
              <button type="button" className="self-start font-semibold underline underline-offset-4">
                {t.common.topUp}
              </button>
            }
          />
        </div>
      )}
      <p className="text-[13px] leading-relaxed text-batu">{text.note(requesterName)}</p>
    </>
  );
}

function RequesterPanel({ detail }: { detail: Detail }) {
  const config = useConfig();
  const { t, fmt } = useI18n();
  const text = t.request.requester;
  const { token: session } = useSession();
  const tx = useTx();
  const r = detail.request;

  const cancel = () =>
    tx.run({
      prompt: { title: text.cancel, detail: t.wallet.call("Escrow", "cancelRequest", text.cancelDetail) },
      send: () => writeContract(config, { ...escrow, functionName: "cancelRequest", args: [BigInt(r.id)] }),
      synced: async () => (await api.request(r.id, session)).request.status === "cancelled",
      success: text.cancelSuccess,
      invalidate: [keys.request(r.id), ["requests"], keys.proof],
    });

  return (
    <>
      <Summary title={text.title}>
        {text.body(<strong className="tabular text-arang">{fmt.whzd(r.collected)} WHZD</strong>, r.contributors)}
      </Summary>
      <CountdownPanel openedAt={r.openedAt} deadline={r.deadline} />
      <p className="text-[13px] leading-relaxed text-batu">{text.note}</p>
      <Dialog>
        <DialogTrigger render={<Button variant="outline" disabled={tx.busy}><TxLabel tx={tx}>{text.cancel}</TxLabel></Button>} />
        <DialogContent className="gap-5 p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{text.confirmTitle}</DialogTitle>
            <DialogDescription className="leading-relaxed text-batu">{text.confirmBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline">{text.back}</Button>} />
            <DialogClose render={<Button variant="destructive" onClick={() => void cancel()}>{text.cancel}</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// The keeper usually lands finalize within a minute of the deadline; a manual send is only offered
// as a fallback once it is clearly taking longer than that.
const MANUAL_AFTER = 3 * 60_000;
const OPEN_ON_CHAIN = [0, 1]; // IEscrow.Status.Open, IEscrow.Status.Funding

/**
 * Time is up and the keeper is sending finalize. Nothing for the viewer to do, so the panel just
 * follows the transfer (refetching until the request is finalized) instead of asking for a click.
 * finalize can only ever run once (the contract reverts a second call), so the manual fallback
 * can't pay twice; it still checks the chain first so nobody signs a transaction that would fail.
 */
function AwaitingFinalize({ detail, requesterName }: { detail: Detail; requesterName: string }) {
  const config = useConfig();
  const { t, fmt } = useI18n();
  const text = t.request.awaiting;
  const queryClient = useQueryClient();
  const { token: session } = useSession();
  const tx = useTx();
  const r = detail.request;
  const empty = BigInt(r.collected) === 0n;
  const recipient = detail.you?.isRequester ? text.yourWallet : requesterName;
  const amount = fmt.whzd(r.collected);
  const overdue = useNow() - new Date(r.deadline).getTime() > MANUAL_AFTER;

  useEffect(() => {
    const timer = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: keys.request(r.id) });
    }, 4000);
    return () => {
      clearInterval(timer);
      // Unmounts once the request is finalized: the requester's balance and the lists changed too.
      void queryClient.invalidateQueries({ queryKey: ["member"] });
      void queryClient.invalidateQueries({ queryKey: ["requests"] });
    };
  }, [queryClient, r.id]);

  const forward = async () => {
    const status = await readContract(config, { ...escrow, functionName: "status", args: [BigInt(r.id)] });
    if (!OPEN_ON_CHAIN.includes(status)) {
      await queryClient.invalidateQueries({ queryKey: keys.request(r.id) });
      toast(text.alreadySent);
      return;
    }
    await tx.run({
      prompt: {
        title: empty ? text.close : text.send(amount, recipient),
        detail: t.wallet.call("Escrow", "finalize", text.sendDetail(requesterName)),
      },
      send: () => writeContract(config, { ...escrow, functionName: "finalize", args: [BigInt(r.id)] }),
      synced: async () => (await api.request(r.id, session)).request.status !== r.status,
      success: empty ? text.closed : text.sent(recipient),
      invalidate: [keys.request(r.id), ["requests"], ["member"]],
    });
  };

  const steps = [
    { label: text.steps.ended, state: "done" },
    { label: empty ? text.steps.closing : text.steps.sending(amount), state: "active" },
    { label: empty ? text.steps.done : text.steps.received(recipient), state: "todo" },
  ] as const;

  return (
    <>
      <Summary icon={<Hourglass className="size-5" />} title={empty ? text.titleEmpty : text.title}>
        {empty ? text.bodyEmpty : text.body(<strong className="tabular text-arang">{amount} WHZD</strong>, recipient)}
      </Summary>

      <ol aria-label={text.process} className="flex flex-col gap-3 rounded-xl bg-embun p-4">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full",
                step.state === "done" && "bg-pandan text-white",
                step.state === "active" && "bg-kunyit-soft text-kunyit-ink",
                step.state === "todo" && "border-2 border-garis",
              )}
            >
              {step.state === "done" && <Check className="size-3.5" strokeWidth={3} />}
              {step.state === "active" && <LoaderCircle className="size-4 motion-safe:animate-spin" />}
            </span>
            <span className={cn(step.state === "todo" ? "text-batu" : "font-semibold")}>{step.label}</span>
          </li>
        ))}
      </ol>

      {overdue && (
        <div className="settle-in flex flex-col gap-3 border-t pt-5">
          <p className="text-[13px] leading-relaxed text-batu">{text.overdue(requesterName)}</p>
          <Button variant="outline" disabled={tx.busy} onClick={() => void forward()}>
            <TxLabel tx={tx}>{text.sendNow}</TxLabel>
          </Button>
        </div>
      )}
    </>
  );
}

function Cancelled({ detail, requesterName }: { detail: Detail; requesterName: string }) {
  const config = useConfig();
  const { t, fmt } = useI18n();
  const text = t.request.cancelled;
  const tx = useTx();
  const { request: r, you } = detail;
  const contribution = you?.contribution;
  if (!contribution || contribution.refunded) {
    return (
      <Summary title={text.title}>
        {text.body(requesterName, r.cancelledAt ? fmt.date(r.cancelledAt) : null, !!contribution?.refunded)}
      </Summary>
    );
  }
  return (
    <>
      <Summary title={text.title}>
        {text.claimable(requesterName, <strong className="tabular">{fmt.whzd(contribution.amount)} WHZD</strong>)}
      </Summary>
      <Button
        size="lg"
        disabled={tx.busy}
        onClick={() =>
          void tx.run({
            prompt: {
              title: t.common.claimBack(fmt.whzd(contribution.amount)),
              detail: t.wallet.call("Escrow", "claimRefund", t.common.refundDetail),
            },
            send: () => writeContract(config, { ...escrow, functionName: "claimRefund", args: [BigInt(r.id)] }),
            success: text.success(fmt.whzd(contribution.amount)),
            invalidate: [keys.request(r.id), keys.refunds, ["member"]],
          })
        }
      >
        <TxLabel tx={tx}>{t.common.claimBack(fmt.whzd(contribution.amount))}</TxLabel>
      </Button>
    </>
  );
}

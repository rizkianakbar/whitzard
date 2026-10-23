"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Hand, HeartHandshake, Hourglass, LoaderCircle, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "wagmi";
import { readContract, signTypedData, writeContract } from "wagmi/actions";
import { parseSignature } from "viem";

import { Button } from "@/components/ui/button";
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
import { useMe } from "@/features/members/members.hooks";
import { CountdownPanel } from "@/features/requests/countdown";
import { useDecline, useRemaining, useRequest } from "@/features/requests/requests.hooks";
import { isLive } from "@/features/requests/requests.lib";
import { useSession } from "@/features/session/session.hooks";
import { TopUpDialog } from "@/features/top-up/top-up";
import { BusyLabel, TxLabel } from "@/features/tx/tx-label";
import { useTx } from "@/features/tx/tx.hooks";
import { TxProof } from "@/features/tx/tx-proof";
import { api, type RequestDetail as Detail } from "@/lib/api";
import { chain } from "@/lib/config";
import { escrow, token } from "@/lib/contracts";
import { useI18n } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import { keys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type ActionsProps = {
  detail: Detail;
  requesterName: string;
  onContributed: () => void;
};

/**
 * What the viewer can do with this request right now, or what happened to it: chip in or pass,
 * cancel (requester), follow the payout, or claim a refund.
 */
export function Actions(props: ActionsProps) {
  const { detail, requesterName, onContributed } = props;
  const { t, fmt } = useI18n();
  const { request: r, you } = detail;
  const remaining = useRemaining(r.deadline);
  const ended = remaining === 0;
  const open = isLive(r) && !ended;

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

type SummaryProps = {
  title: string;
  icon?: React.ReactNode;
  tone?: keyof typeof tones;
  children: React.ReactNode;
};

function Summary(props: SummaryProps) {
  const { title, icon, tone = "pandan", children } = props;
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

type ContributePanelProps = {
  detail: Detail;
  requesterName: string;
  onContributed: () => void;
};

function ContributePanel(props: ContributePanelProps) {
  const { detail, requesterName, onContributed } = props;
  const config = useConfig();
  const { t, fmt } = useI18n();
  const text = t.request.contribute;
  const { address, token: session } = useSession();
  const { data: me } = useMe();
  const tx = useTx();
  const { request: r, you } = detail;
  const decline = useDecline(r.id);
  const declining = decline.isPending;
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
      invalidate: [keys.request(r.id), keys.requests, keys.anyMember],
    });
    if (receipt) onContributed();
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
          <Button variant="ghost" disabled={tx.busy || declining} onClick={() => decline.mutate()}>
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

type RequesterPanelProps = {
  detail: Detail;
};

function RequesterPanel(props: RequesterPanelProps) {
  const { detail } = props;
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
      invalidate: [keys.request(r.id), keys.requests, keys.proof],
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

type AwaitingFinalizeProps = {
  detail: Detail;
  requesterName: string;
};

/**
 * Time is up and the keeper is sending finalize. Nothing for the viewer to do, so the panel just
 * follows the transfer (refetching until the request is finalized) instead of asking for a click.
 * finalize can only ever run once (the contract reverts a second call), so the manual fallback
 * can't pay twice; it still checks the chain first so nobody signs a transaction that would fail.
 */
function AwaitingFinalize(props: AwaitingFinalizeProps) {
  const { detail, requesterName } = props;
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
  const overdue = useNow() - Date.parse(r.deadline) > MANUAL_AFTER;

  useRequest(r.id, 4000);
  // Unmounts once the request is finalized: the requester's balance and the lists changed too.
  useEffect(
    () => () => {
      void queryClient.invalidateQueries({ queryKey: keys.anyMember });
      void queryClient.invalidateQueries({ queryKey: keys.requests });
    },
    [queryClient],
  );

  const forward = async () => {
    // If the read fails, send anyway: the wallet and the contract still refuse a second finalize.
    const status = await readContract(config, { ...escrow, functionName: "status", args: [BigInt(r.id)] }).catch(() => undefined);
    if (status !== undefined && !OPEN_ON_CHAIN.includes(status)) {
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
      invalidate: [keys.request(r.id), keys.requests, keys.anyMember],
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

type CancelledProps = {
  detail: Detail;
  requesterName: string;
};

function Cancelled(props: CancelledProps) {
  const { detail, requesterName } = props;
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
            invalidate: [keys.request(r.id), keys.refunds, keys.anyMember],
          })
        }
      >
        <TxLabel tx={tx}>{t.common.claimBack(fmt.whzd(contribution.amount))}</TxLabel>
      </Button>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Hand, HandHeart, Hourglass, RotateCcw, Send } from "lucide-react";
import { useConfig } from "wagmi";
import { writeContract } from "wagmi/actions";
import { toast } from "sonner";

import { Avatar, callName } from "@/components/avatar";
import { CountdownPill } from "@/components/countdown";
import { FundingProgress } from "@/components/funding";
import { isLive, PastRequestRow } from "@/components/request-row";
import { ShareGrid } from "@/components/share-grid";
import { BusyLabel, TxLabel } from "@/components/tx-label";
import { TopUpDialog } from "@/components/top-up";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, type Member, type Request } from "@/lib/api";
import { escrow, registry } from "@/lib/contracts";
import { errorMessage } from "@/lib/errors";
import { formatWhzd, shortAddress } from "@/lib/format";
import { keys, useEligibility, useMe, useMember, useMemberStats, useRefunds, useRequests } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { phaseLabel, useTx } from "@/lib/tx";
import { cn } from "@/lib/utils";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

export function Dashboard() {
  const { data: me } = useMe();
  if (!me) return null;
  const name = me.profile?.nickname ?? me.profile?.displayName?.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[39px] leading-tight font-extrabold text-pandan">
          {greeting()}
          {name ? `, ${name}` : ""}
        </h1>
        <Link href="/ajukan" className={buttonVariants({ variant: "outline" })}>
          Ajukan bantuan
        </Link>
      </div>
      <SetupBanner me={me} />
      <RefundNotice />
      <Wallet me={me} />
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-8">
        <Waiting />
        <MyRequests />
      </div>
    </div>
  );
}

/** Shown until the profile and first top-up are done (Ready is a choice, so it doesn't count). */
function SetupBanner({ me }: { me: Member }) {
  const hasTokens = BigInt(me.chain.faucetClaimed) > 0n || BigInt(me.chain.balance) > 0n;
  if (me.profile?.displayName && hasTokens) return null;
  return (
    <Link
      href="/gabung"
      className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-dashed border-pandan/30 bg-card p-5 hover:border-pandan/60"
    >
      <div className="flex min-w-60 flex-1 flex-col gap-1">
        <span className="font-bold">Selesaikan pendaftaranmu</span>
        <span className="text-batu">
          {!me.profile?.displayName ? "Isi profil" : "Isi saldo"} supaya kamu bisa mulai membantu dan mengajukan bantuan.
        </span>
      </div>
      <ArrowRight aria-hidden="true" className="size-5 text-pandan" />
    </Link>
  );
}

// ---------------------------------------------------------------- wallet

/** Balance, what has moved through it, and whether new requests count you in: one card. */
function Wallet({ me }: { me: Member }) {
  const config = useConfig();
  const ready = useTx();
  const { data: st } = useMemberStats();
  const empty = BigInt(me.chain.balance) === 0n;

  const toggleReady = (value: boolean) =>
    ready.run({
      send: () => writeContract(config, { ...registry, functionName: "setReady", args: [value] }),
      synced: async () => (await api.member(me.address)).chain.ready === value,
      success: value ? "Kamu siap membantu." : "Kamu tidak dihitung di permintaan baru.",
      invalidate: [keys.member(me.address), keys.proof],
    });

  return (
    <section aria-label="Saldo" className="flex flex-col gap-6 rounded-3xl bg-pandan-deep p-6 text-white sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-white/70">Saldo</span>
            <span className="tabular text-[49px] leading-none font-extrabold tracking-tight">
              {formatWhzd(me.chain.balance)} <span className="text-xl font-bold tracking-normal">WHZD</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TopUpDialog me={me} trigger={<Button className="bg-white text-pandan-deep hover:bg-pandan-soft">Isi saldo</Button>} />
            <span className="text-sm text-white/70">Token uji, tidak bernilai uang</span>
          </div>
        </div>
        <dl className="grid min-w-64 grid-cols-2 gap-x-8 gap-y-1 sm:gap-x-12">
          <Figure label="Kamu berikan" value={st?.given} note={st && `${st.helped} kali membantu`} />
          <Figure
            label="Kamu terima"
            value={st?.received}
            note={st && (st.requests ? `${st.funded} permintaan tersalurkan` : "Belum pernah mengajukan")}
          />
          {st && BigInt(st.refunded) > 0n && (
            <p className="col-span-2 pt-2 text-[13px] text-white/60">
              <span className="tabular">{formatWhzd(st.refunded)} WHZD</span> kembali dari permintaan yang dibatalkan
            </p>
          )}
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
              Siap membantu
            </span>
            <span id="ready-help" className="text-[13px] leading-snug text-white/70">
              {ready.busy
                ? phaseLabel[ready.phase]
                : me.chain.ready
                  ? "Kamu ikut dihitung saat ada permintaan baru."
                  : empty
                    ? "Isi saldo dulu sebelum menyalakan."
                    : "Kamu tidak dihitung di permintaan baru."}
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
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-white/70">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        <span className="tabular text-2xl font-bold">
          {value === undefined ? "–" : formatWhzd(value)} <span className="text-sm font-semibold text-white/70">WHZD</span>
        </span>
        <span className="min-h-[1lh] text-[13px] text-white/60">{note}</span>
      </dd>
    </div>
  );
}

/** Whether you can open a request right now, and what to do if not. */
function CanRequest() {
  const eligibility = useEligibility();
  const { icon, title, text, href, cta } = !eligibility
    ? { icon: null, title: "Mengajukan bantuan", text: "Memeriksa…", href: null, cta: null }
    : eligibility.can
      ? {
          icon: <Check className="size-4.5" strokeWidth={2.5} />,
          title: "Kamu bisa mengajukan bantuan",
          text: "Saat butuh biaya berobat, ajukan kapan saja.",
          href: "/ajukan",
          cta: "Ajukan",
        }
      : eligibility.reason === "running"
        ? {
            icon: <Hourglass className="size-4.5" />,
            title: "Permintaanmu masih berjalan",
            text: "Bisa mengajukan lagi setelah waktunya habis.",
            href: `/permintaan/${eligibility.requestId}`,
            cta: "Lihat",
          }
        : {
            icon: <HandHeart className="size-4.5" />,
            title: "Belum bisa mengajukan",
            text: "Bantu satu permintaan anggota lain dulu.",
            href: "/permintaan",
            cta: "Cari",
          };
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
  const { data } = useRefunds();
  const tx = useTx();
  if (!data || data.refunds.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {data.refunds.map((refund) => (
        <div key={refund.requestId} className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl bg-kunyit-soft px-6 py-5 text-kunyit-ink">
          <RotateCcw aria-hidden="true" className="size-5" />
          <p className="min-w-72 flex-1">
            <Link href={`/permintaan/${refund.requestId}`} className="font-semibold underline underline-offset-4">
              Permintaan nomor {refund.requestId}
            </Link>{" "}
            dibatalkan. Iuranmu <strong className="tabular">{formatWhzd(refund.amount)} WHZD</strong> bisa kamu ambil
            kembali.
          </p>
          <Button
            disabled={tx.busy}
            onClick={() =>
              void tx.run({
                send: () =>
                  writeContract(config, { ...escrow, functionName: "claimRefund", args: [BigInt(refund.requestId)] }),
                success: `${formatWhzd(refund.amount)} WHZD sudah kembali ke saldomu.`,
                invalidate: [keys.refunds, ["member"]],
              })
            }
          >
            <TxLabel tx={tx}>{`Ambil kembali ${formatWhzd(refund.amount)} WHZD`}</TxLabel>
          </Button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- lists

function SectionTitle({ id, children, action }: { id: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-[25px] font-extrabold">
        {children}
      </h2>
      {action}
    </div>
  );
}

// Waiting for your answer first, then the ones you passed on (you can still help), then the ones you
// already helped, so a running request never drops off the dashboard just because you answered.
const answerOrder = { pending: 0, participating: 0, declined: 1, contributed: 2 } as const;

function Waiting() {
  const { data, isPending } = useRequests("for-me");
  const live = (data ?? [])
    .filter((r) => isLive(r) && r.yourResponse)
    .sort((a, b) => answerOrder[a.yourResponse!] - answerOrder[b.yourResponse!]);
  const waiting = live.filter((r) => answerOrder[r.yourResponse!] === 0).length;
  return (
    <section aria-labelledby="waiting" className="flex flex-col gap-4">
      <SectionTitle
        id="waiting"
        action={
          live.length > 0 && (
            <span className="text-sm font-semibold text-batu">
              {waiting ? `${waiting} menunggu jawabanmu` : "Semua sudah kamu jawab"}
            </span>
          )
        }
      >
        Permintaan berjalan
      </SectionTitle>
      {isPending ? (
        <Skeleton className="h-40 w-full rounded-3xl" />
      ) : live.length === 0 ? (
        <p className="rounded-3xl border border-dashed bg-card p-7 leading-relaxed text-batu">
          Belum ada permintaan yang sedang berjalan untukmu. Saat anggota lain butuh bantuan dan siap membantu menyala,
          permintaannya muncul di sini.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {live.map((r) => (
            <WaitingCard key={r.id} request={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Requester({ request: r }: { request: Request }) {
  const { data: member } = useMember(r.requester);
  const profile = member?.profile;
  return (
    <div className="flex items-center gap-3">
      <Avatar address={r.requester} profile={profile} className="size-11 text-sm" />
      <div className="flex flex-col leading-snug">
        <span className="font-semibold">{callName(profile, shortAddress(r.requester))}</span>
        {profile?.city && <span className="text-sm text-batu">{profile.city}</span>}
      </div>
    </div>
  );
}

function WaitingCard({ request: r }: { request: Request }) {
  const { token: session } = useSession();
  const answer = r.yourResponse;
  return (
    <li
      className={cn(
        "flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-6",
        answer === "contributed" && "border-kunyit/50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Requester request={r} />
        <CountdownPill deadline={r.deadline} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Link href={`/permintaan/${r.id}`} className="text-xl leading-snug font-bold text-balance hover:underline">
          {r.title ?? `Permintaan nomor ${r.id}`}
        </Link>
        {r.description && <p className="line-clamp-2 leading-relaxed text-batu">{r.description}</p>}
      </div>
      <FundingProgress request={r} className="rounded-xl bg-embun p-4" />
      {answer === "contributed" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 rounded-full bg-kunyit-soft py-1.5 pr-3.5 pl-2 text-sm font-semibold text-kunyit-ink">
            <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-kunyit text-white">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <span className="tabular">Kamu sudah membantu {formatWhzd(r.share)} WHZD</span>
          </span>
          <Link href={`/permintaan/${r.id}`} className="flex items-center gap-1 text-sm font-semibold text-pandan">
            Lihat riwayat
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : answer === "declined" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2.5 text-sm text-batu">
            <Hand aria-hidden="true" className="size-4.5 shrink-0" />
            Kamu tidak ikut kali ini. Masih bisa membantu sampai waktunya habis.
          </span>
          <Link href={`/permintaan/${r.id}`} className={cn(buttonVariants({ variant: "outline" }), "tabular w-full sm:w-auto")}>
            Bantu {formatWhzd(r.share)} WHZD
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href={`/permintaan/${r.id}`} className={cn(buttonVariants(), "tabular w-full sm:w-auto")}>
            Bantu {formatWhzd(r.share)} WHZD
          </Link>
          <DeclineButton id={r.id} token={session} />
        </div>
      )}
    </li>
  );
}

function DeclineButton({ id, token }: { id: number; token: string | null }) {
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
          toast("Kamu tidak ikut kali ini.", {
            description: "Permintaannya tetap di sini, dan masih bisa kamu bantu sampai waktunya habis.",
          });
        } catch (error) {
          toast.error(errorMessage(error));
          setBusy(false);
        }
      }}
    >
      <BusyLabel busy={busy ? "Menyimpan" : null}>Tidak kali ini</BusyLabel>
    </Button>
  );
}

function MyRequests() {
  const { data, isPending } = useRequests("mine");
  // Waiting to be sent still counts as running for the requester: the money hasn't arrived yet.
  const running = (r: Request) => isLive(r) || r.awaitingFinalize;
  const live = (data ?? []).filter(running);
  const past = (data ?? []).filter((r) => !running(r)).slice(0, 3);
  const any = live.length + past.length > 0;
  return (
    <section aria-labelledby="mine" className="flex flex-col gap-4">
      <SectionTitle
        id="mine"
        action={
          any && (
            <Link href="/permintaan" className="font-semibold text-pandan underline underline-offset-4">
              Semua permintaan
            </Link>
          )
        }
      >
        Permintaanmu
      </SectionTitle>
      {isPending ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : !any ? (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed bg-card p-6 sm:flex-row sm:items-center sm:gap-5">
          <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-pandan-soft text-pandan">
            <HandHeart className="size-6" />
          </span>
          <p className="flex-1 leading-relaxed text-batu">
            <span className="block font-bold text-arang">Belum pernah mengajukan</span>
            Saat butuh biaya berobat, ajukan di sini. Anggota yang siap membantu langsung diberi tahu.
          </p>
          <Link href="/ajukan" className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}>
            Ajukan bantuan
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {live.length > 0 && (
            <ul className="flex flex-col gap-4">
              {live.map((r) => (
                <LiveRequestCard key={r.id} request={r} />
              ))}
            </ul>
          )}
          {past.length > 0 && (
            <ul className="overflow-hidden rounded-2xl border bg-card">
              {past.map((r, i) => (
                <PastRequestRow key={r.id} request={r} first={i === 0} mine />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/** Your request while it collects: everything you'd want to know at a glance, and what happens next. */
function LiveRequestCard({ request: r }: { request: Request }) {
  const sending = r.awaitingFinalize;
  return (
    <li>
      <Link
        href={`/permintaan/${r.id}`}
        className="group flex flex-col gap-5 rounded-2xl border bg-card p-5 transition-colors duration-200 hover:border-pandan/40 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-pandan">
              <span aria-hidden="true" className="relative flex size-2">
                <span className="absolute inset-0 rounded-full bg-kunyit motion-safe:animate-ping" />
                <span className="relative size-2 rounded-full bg-kunyit" />
              </span>
              {sending ? "Sedang dikirim ke dompetmu" : "Sedang mengumpulkan"}
            </span>
            <span className="text-xl leading-snug font-bold text-balance">{r.title ?? `Permintaan nomor ${r.id}`}</span>
          </div>
          {!sending && <CountdownPill deadline={r.deadline} />}
        </div>

        <div className="flex flex-col gap-4 rounded-xl bg-embun p-4">
          <FundingProgress request={r} />
          <ShareGrid variant="small" size={r.snapshotSize} contributed={r.contributors} declined={0} />
        </div>


        <div className="flex items-center justify-between gap-3 border-t pt-4 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-batu">
            <Send aria-hidden="true" className="size-4 shrink-0" />
            {sending ? "Tidak perlu melakukan apa pun." : "Dikirim otomatis ke dompetmu saat waktu habis."}
          </span>
          <span className="flex shrink-0 items-center gap-1 font-semibold text-pandan">
            Lihat
            <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </li>
  );
}

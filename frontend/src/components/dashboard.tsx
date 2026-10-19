"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Clock, RotateCcw } from "lucide-react";
import { useConfig } from "wagmi";
import { writeContract } from "wagmi/actions";
import { toast } from "sonner";

import { Avatar, callName } from "@/components/avatar";
import { ShareGrid } from "@/components/share-grid";
import { StatusBadge } from "@/components/status-badge";
import { Swap } from "@/components/swap";
import { TopUpDialog } from "@/components/top-up";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, type Member, type Request } from "@/lib/api";
import { escrow, registry } from "@/lib/contracts";
import { errorMessage } from "@/lib/errors";
import { formatWhzd, shortAddress, timeAgo, timeLeft } from "@/lib/format";
import { keys, useMe, useMember, useNotifications, useProof, useRefunds, useRequests } from "@/lib/queries";
import { useNow } from "@/lib/now";
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
    <div className="flex flex-col gap-10">
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
      <Overview me={me} />
      <RefundNotice />
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-10">
          <Waiting />
          <MyRequests />
        </div>
        <LatestNotifications />
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

// ---------------------------------------------------------------- overview

function Overview({ me }: { me: Member }) {
  const config = useConfig();
  const ready = useTx();
  const { data: proof } = useProof();

  const toggleReady = (value: boolean) =>
    ready.run({
      send: () => writeContract(config, { ...registry, functionName: "setReady", args: [value] }),
      synced: async () => (await api.member(me.address)).chain.ready === value,
      success: value ? "Kamu siap membantu." : "Kamu tidak dihitung di permintaan baru.",
      invalidate: [keys.member(me.address), keys.proof],
    });

  return (
    <section aria-label="Ringkasan" className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
      <div className="flex flex-col justify-between gap-6 rounded-3xl bg-pandan-deep p-7 text-white md:col-span-2 lg:col-span-1">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-white/70">Saldo</span>
          <span className="tabular text-[49px] leading-none font-extrabold tracking-tight">
            {formatWhzd(me.chain.balance)} <span className="text-xl font-bold tracking-normal">WHZD</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TopUpDialog
            me={me}
            trigger={<Button className="bg-white text-pandan-deep hover:bg-pandan-soft">Isi saldo</Button>}
          />
          <span className="text-sm text-white/70">Token uji, tidak bernilai uang</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-7">
        <div className="flex items-start justify-between gap-4">
          <span id="ready-label" className="text-lg font-bold">
            Siap membantu
          </span>
          <Switch
            size="lg"
            aria-labelledby="ready-label"
            aria-describedby="ready-help"
            checked={me.chain.ready}
            disabled={ready.busy || (!me.chain.ready && BigInt(me.chain.balance) === 0n)}
            onCheckedChange={(value) => void toggleReady(value)}
          />
        </div>
        <p id="ready-help" className="leading-relaxed text-batu">
          {ready.busy
            ? phaseLabel[ready.phase]
            : me.chain.ready
              ? "Kamu ikut dihitung saat ada permintaan baru, dan diberi tahu berapa bagianmu."
              : BigInt(me.chain.balance) === 0n
                ? "Isi saldo dulu sebelum menyalakan."
                : "Kamu tidak dihitung di permintaan baru. Nyalakan saat kamu siap ikut membantu."}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-7">
        <span className="text-lg font-bold">Mengajukan bantuan</span>
        {proof?.canOpenRequest ? (
          <>
            <p className="flex items-center gap-2 font-semibold text-daun-ink">
              <Check aria-hidden="true" className="size-5" strokeWidth={2.5} />
              Kamu bisa mengajukan
            </p>
            <Link href="/ajukan" className="self-start font-semibold text-pandan underline underline-offset-4">
              Ajukan bantuan
            </Link>
          </>
        ) : (
          <p className="leading-relaxed text-batu">
            Belum bisa. Bantu satu permintaan anggota lain dulu, atau tunggu permintaanmu yang masih berjalan selesai.
          </p>
        )}
      </div>
    </section>
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
            <Swap>{tx.busy ? phaseLabel[tx.phase] : `Ambil kembali ${formatWhzd(refund.amount)} WHZD`}</Swap>
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

function Waiting() {
  const { data, isPending } = useRequests("for-me");
  const waiting = (data ?? []).filter(
    (r) =>
      (r.status === "open" || r.status === "funding") &&
      !r.awaitingFinalize &&
      (r.yourResponse === "pending" || r.yourResponse === "participating"),
  );
  return (
    <section aria-labelledby="waiting" className="flex flex-col gap-4">
      <SectionTitle id="waiting">Butuh bantuanmu</SectionTitle>
      {isPending ? (
        <Skeleton className="h-40 w-full rounded-3xl" />
      ) : waiting.length === 0 ? (
        <p className="rounded-3xl border border-dashed bg-card p-7 leading-relaxed text-batu">
          Belum ada yang menunggu jawabanmu. Saat anggota lain butuh bantuan dan siap membantu menyala, permintaannya
          muncul di sini.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {waiting.map((r) => (
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
  const left = timeLeft(r.deadline, useNow());
  return (
    <li className="flex flex-col gap-5 rounded-3xl border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Requester request={r} />
        {left && (
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-batu">
            <Clock aria-hidden="true" className="size-4" />
            {left} lagi
          </span>
        )}
      </div>
      <Link href={`/permintaan/${r.id}`} className="text-xl font-bold hover:underline">
        {r.title ?? `Permintaan nomor ${r.id}`}
      </Link>
      <ShareGrid variant="medium" size={r.snapshotSize} contributed={r.contributors} declined={0} you={r.yourResponse} />
      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        <Link href={`/permintaan/${r.id}`} className={cn(buttonVariants(), "tabular")}>
          Bantu {formatWhzd(r.share)} WHZD
        </Link>
        <DeclineButton id={r.id} token={session} />
        <span className="tabular ml-auto text-sm text-batu">
          {formatWhzd(r.collected)} dari {formatWhzd(r.amount)} WHZD
        </span>
      </div>
    </li>
  );
}

function DeclineButton({ id, token }: { id: number; token: string | null }) {
  const queryClient = useQueryClient();
  return (
    <Button
      variant="ghost"
      onClick={async () => {
        try {
          await api.respond(token!, id, "decline");
          await queryClient.invalidateQueries({ queryKey: ["requests"] });
          toast("Kamu tidak ikut membantu permintaan ini.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
    >
      Tidak kali ini
    </Button>
  );
}

function MyRequests() {
  const { data, isPending } = useRequests("mine");
  const mine = (data ?? []).slice(0, 3);
  return (
    <section aria-labelledby="mine" className="flex flex-col gap-4">
      <SectionTitle
        id="mine"
        action={
          mine.length > 0 && (
            <Link href="/permintaan" className="font-semibold text-pandan underline underline-offset-4">
              Semua permintaan
            </Link>
          )
        }
      >
        Permintaanmu
      </SectionTitle>
      {isPending ? (
        <Skeleton className="h-24 w-full rounded-3xl" />
      ) : mine.length === 0 ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-3xl border border-dashed bg-card p-7">
          <p className="min-w-72 flex-1 leading-relaxed text-batu">
            Kamu belum pernah mengajukan. Saat butuh biaya berobat, ajukan di sini dan anggota yang siap membantu
            langsung diberi tahu.
          </p>
          <Link href="/ajukan" className={buttonVariants({ variant: "outline" })}>
            Ajukan bantuan
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-3xl border bg-card">
          {mine.map((r, i) => (
            <li key={r.id} className={cn(i > 0 && "border-t")}>
              <Link href={`/permintaan/${r.id}`} className="flex flex-wrap items-center gap-4 p-5 hover:bg-muted/60">
                <div className="flex min-w-60 flex-1 flex-col gap-1">
                  <span className="font-bold">{r.title ?? `Permintaan nomor ${r.id}`}</span>
                  <span className="tabular text-sm text-batu">
                    {formatWhzd(r.collected)} dari {formatWhzd(r.amount)} WHZD terkumpul
                  </span>
                </div>
                <StatusBadge request={r} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LatestNotifications() {
  const { data } = useNotifications(5);
  const now = useNow();
  return (
    <aside aria-labelledby="notifications" className="flex min-w-0 flex-col gap-4">
      <SectionTitle
        id="notifications"
        action={
          <Link href="/notifikasi" className="font-semibold text-pandan underline underline-offset-4">
            Lihat semua
          </Link>
        }
      >
        Notifikasi
      </SectionTitle>
      <div className="rounded-3xl border bg-card p-2">
        {data && data.length === 0 && <p className="p-4 text-batu">Belum ada notifikasi.</p>}
        <ul className="flex flex-col">
          {(data ?? []).map((n) => (
            <li key={n.id} className="flex gap-3 rounded-2xl p-3">
              <span
                aria-label={n.isRead ? undefined : "Belum dibaca"}
                className={cn("mt-2 size-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-kunyit")}
              />
              <div className="flex flex-col gap-1">
                {n.requestId ? (
                  <Link href={`/permintaan/${n.requestId}`} className="font-semibold hover:underline">
                    {n.title}
                  </Link>
                ) : (
                  <span className="font-semibold">{n.title}</span>
                )}
                <span className="text-sm leading-relaxed text-batu">{n.description}</span>
                <span className="text-xs text-batu">{timeAgo(n.createdAt, now)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

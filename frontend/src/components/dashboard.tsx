"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Check, RotateCcw } from "lucide-react";
import { useConfig } from "wagmi";
import { writeContract } from "wagmi/actions";
import { toast } from "sonner";

import { SignedIn } from "@/components/gate";
import { ShareGrid } from "@/components/share-grid";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, type Member, type Request } from "@/lib/api";
import { escrow, registry, token } from "@/lib/contracts";
import { errorMessage } from "@/lib/errors";
import { formatWhzd, timeAgo, timeLeft } from "@/lib/format";
import { keys, useMe, useNotifications, useProof, useRefunds, useRequests } from "@/lib/queries";
import { useNow } from "@/lib/now";
import { useSession } from "@/lib/session";
import { phaseLabel, useTx } from "@/lib/tx";
import { cn } from "@/lib/utils";

const CAP = 1000n * 10n ** 18n;

export function Dashboard() {
  return (
    <SignedIn reason="Hubungkan dompet untuk melihat siapa yang sedang butuh bantuan, dan untuk ikut membantu.">
      <SignedInDashboard />
    </SignedIn>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

function SignedInDashboard() {
  const { data: me, isPending } = useMe();
  if (isPending || !me) return <Skeleton className="h-72 w-full rounded-xl" />;
  return <Home me={me} />;
}

function Home({ me }: { me: Member }) {
  const hasTokens = BigInt(me.chain.faucetClaimed) > 0n || BigInt(me.chain.balance) > 0n;
  // Decided once per visit: a new member keeps the steps on screen until Ready is on, even though
  // registering already makes them "onboarded"; a member who later turns Ready off is not sent back.
  const [onboarding] = useState(() => !me.chain.registered || !hasTokens);
  if (onboarding && !(me.chain.registered && hasTokens && me.chain.ready)) return <Onboarding me={me} />;

  const name = me.profile?.displayName?.split(" ")[0];
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[31px] font-semibold tracking-tight">
        {greeting()}
        {name ? `, ${name}` : ""}
      </h1>
      <StatusBar me={me} />
      <RefundNotice />
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <Waiting />
          <MyRequests />
        </div>
        <LatestNews />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- onboarding

function Onboarding({ me }: { me: Member }) {
  const config = useConfig();
  const { address } = useSession();
  const tx = useTx();
  const hasTokens = BigInt(me.chain.faucetClaimed) > 0n || BigInt(me.chain.balance) > 0n;
  const steps = [
    {
      title: "Ambil token uji",
      body: "100 WHZD gratis dari faucet. Token ini hanya untuk jaringan uji dan tidak bernilai uang.",
      done: hasTokens,
      action: "Ambil 100 WHZD",
      run: () =>
        tx.run({
          send: () => writeContract(config, { ...token, functionName: "faucet" }),
          synced: async () => BigInt((await api.member(address!)).chain.balance) > 0n,
          success: "100 WHZD sudah masuk ke dompetmu.",
          invalidate: [keys.member(address!)],
        }),
    },
    {
      title: "Daftar sebagai anggota",
      body: "Alamat dompetmu dicatat di daftar anggota. Cukup sekali.",
      done: me.chain.registered,
      action: "Daftar",
      run: () =>
        tx.run({
          send: () => writeContract(config, { ...registry, functionName: "register" }),
          synced: async () => (await api.member(address!)).profile !== null,
          success: "Kamu sudah terdaftar sebagai anggota.",
          invalidate: [keys.member(address!)],
        }),
    },
    {
      title: "Nyalakan siap membantu",
      body: "Kamu ikut dihitung saat ada permintaan baru. Bisa dimatikan kapan saja.",
      done: me.chain.ready,
      action: "Nyalakan",
      run: () =>
        tx.run({
          send: () => writeContract(config, { ...registry, functionName: "setReady", args: [true] }),
          synced: async () => (await api.member(address!)).chain.ready,
          success: "Kamu siap membantu.",
          invalidate: [keys.member(address!)],
        }),
    },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-[31px] font-semibold tracking-tight">Selamat datang di Whitzard</h1>
        <p className="leading-relaxed text-batu">
          Anggota saling membantu biaya berobat. Setiap permintaan dibagi rata ke anggota yang siap membantu, dan
          semua iuran tercatat di blockchain. Tiga langkah untuk mulai:
        </p>
      </div>
      <ol className="flex flex-col rounded-xl border bg-card">
        {steps.map((step, i) => (
          <li key={step.title} className={cn("flex flex-wrap items-center gap-4 p-6", i > 0 && "border-t")}>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full font-bold",
                step.done ? "bg-nila text-white" : i === current ? "border-2 border-nila" : "border text-batu",
              )}
            >
              {step.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <div className="flex min-w-60 flex-1 flex-col gap-1">
              <h2 className="font-semibold">
                {step.title}
                {step.done && <span className="sr-only"> (selesai)</span>}
              </h2>
              <p className="text-[13px] leading-relaxed text-batu">{step.body}</p>
            </div>
            {i === current && (
              <Button disabled={tx.busy} onClick={() => void step.run()}>
                {tx.busy ? phaseLabel[tx.phase] : step.action}
              </Button>
            )}
          </li>
        ))}
      </ol>
      <p className="text-[13px] leading-relaxed text-batu">
        Setiap langkah adalah satu transaksi di dompetmu. Di jaringan uji Sepolia, biayanya dibayar dengan ETH uji.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- status

function StatusBar({ me }: { me: Member }) {
  const config = useConfig();
  const { address } = useSession();
  const ready = useTx();
  const faucet = useTx();
  const { data: proof } = useProof();
  const now = useNow();

  const next = Number(me.chain.faucetNextClaimAt) * 1000;
  const capped = BigInt(me.chain.faucetClaimed) >= CAP;
  const canClaim = !capped && next <= now;
  const nextLabel = new Date(next).toLocaleString("id-ID", { weekday: "long", hour: "2-digit", minute: "2-digit" });

  const toggleReady = (value: boolean) =>
    ready.run({
      send: () => writeContract(config, { ...registry, functionName: "setReady", args: [value] }),
      synced: async () => (await api.member(address!)).chain.ready === value,
      success: value ? "Kamu siap membantu." : "Kamu tidak dihitung di permintaan baru.",
      invalidate: [keys.member(address!), keys.proof],
    });

  return (
    <section aria-label="Statusmu" className="flex flex-wrap rounded-xl border bg-card">
      <div className="flex flex-[1_1_280px] items-start justify-between gap-4 px-7 py-6">
        <div className="flex flex-col gap-1.5">
          <span id="ready-label" className="font-semibold">
            Siap membantu
          </span>
          <span className="text-[13px] leading-relaxed text-batu">
            {ready.busy
              ? phaseLabel[ready.phase]
              : me.chain.ready
                ? "Kamu ikut dihitung saat ada permintaan baru."
                : "Kamu tidak dihitung di permintaan baru."}
          </span>
        </div>
        <Switch
          size="lg"
          aria-labelledby="ready-label"
          checked={me.chain.ready}
          disabled={ready.busy || (!me.chain.ready && BigInt(me.chain.balance) === 0n)}
          onCheckedChange={(value) => void toggleReady(value)}
        />
      </div>
      <div className="flex flex-[1_1_220px] flex-col gap-1.5 border-t px-7 py-6 sm:border-t-0 sm:border-l">
        <span className="text-[13px] text-batu">Saldo</span>
        <span className="tabular text-[25px] font-bold">{formatWhzd(me.chain.balance)} WHZD</span>
        {canClaim ? (
          <Button
            variant="outline"
            className="self-start"
            disabled={faucet.busy}
            onClick={() =>
              void faucet.run({
                send: () => writeContract(config, { ...token, functionName: "faucet" }),
                synced: async () => (await api.member(address!)).chain.balance !== me.chain.balance,
                success: "Token uji sudah masuk ke dompetmu.",
                invalidate: [keys.member(address!)],
              })
            }
          >
            {faucet.busy ? phaseLabel[faucet.phase] : "Ambil 100 WHZD"}
          </Button>
        ) : (
          <span className="text-[13px] text-batu">
            {capped ? "Kamu sudah mengambil semua token uji." : `Bisa ambil 100 WHZD lagi ${nextLabel}.`}
          </span>
        )}
      </div>
      <div className="flex flex-[1_1_280px] flex-col gap-1.5 border-t px-7 py-6 lg:border-t-0 lg:border-l">
        <span className="text-[13px] text-batu">Mengajukan bantuan</span>
        {proof?.canOpenRequest ? (
          <>
            <span className="font-semibold">Kamu bisa mengajukan</span>
            <Link href="/ajukan" className="text-[13px] font-semibold underline underline-offset-4">
              Ajukan bantuan
            </Link>
          </>
        ) : (
          <>
            <span className="font-semibold">Belum bisa mengajukan</span>
            <span className="text-[13px] leading-relaxed text-batu">
              Bantu satu permintaan anggota lain dulu. Kalau permintaanmu masih berjalan, tunggu sampai selesai.
            </span>
          </>
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
        <div key={refund.requestId} className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border bg-card px-5 py-4">
          <RotateCcw aria-hidden="true" className="size-5" />
          <p className="min-w-72 flex-1">
            <Link href={`/permintaan/${refund.requestId}`} className="underline underline-offset-4">
              Permintaan nomor {refund.requestId}
            </Link>{" "}
            dibatalkan. Iuranmu <strong className="tabular">{formatWhzd(refund.amount)} WHZD</strong> bisa kamu ambil
            kembali.
          </p>
          <Button
            variant="outline"
            disabled={tx.busy}
            onClick={() =>
              void tx.run({
                send: () =>
                  writeContract(config, { ...escrow, functionName: "claimRefund", args: [BigInt(refund.requestId)] }),
                success: `${formatWhzd(refund.amount)} WHZD sudah kembali ke dompetmu.`,
                invalidate: [keys.refunds, ["member"]],
              })
            }
          >
            {tx.busy ? phaseLabel[tx.phase] : `Ambil kembali ${formatWhzd(refund.amount)} WHZD`}
          </Button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- lists

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
      <h2 id="waiting" className="text-xl font-semibold">
        Menunggu jawabanmu
      </h2>
      {isPending ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : waiting.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-6 leading-relaxed text-batu">
          Tidak ada yang menunggu. Saat anggota lain butuh bantuan dan kamu sedang siap membantu, permintaannya muncul
          di sini.
        </p>
      ) : (
        <ul className="rounded-xl border bg-card">
          {waiting.map((r, i) => (
            <WaitingRow key={r.id} request={r} first={i === 0} />
          ))}
        </ul>
      )}
    </section>
  );
}

function WaitingRow({ request: r, first }: { request: Request; first: boolean }) {
  const { token: session } = useSession();
  const left = timeLeft(r.deadline, useNow());
  return (
    <li className={cn("flex flex-wrap items-center gap-5 p-6", !first && "border-t")}>
      <div className="flex min-w-70 flex-1 flex-col gap-2.5">
        <Link href={`/permintaan/${r.id}`} className="text-xl font-semibold hover:underline">
          {r.title ?? `Permintaan nomor ${r.id}`}
        </Link>
        <span className="text-[13px] text-batu">
          Meminta {formatWhzd(r.amount)} WHZD.{left ? ` Ditutup dalam ${left}.` : ""}
        </span>
        <ShareGrid variant="small" size={r.snapshotSize} contributed={r.contributors} declined={0} you={r.yourResponse} />
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Link href={`/permintaan/${r.id}`} className={cn(buttonVariants(), "tabular")}>
          Bantu {formatWhzd(r.share)} WHZD
        </Link>
        <DeclineButton id={r.id} token={session} />
      </div>
    </li>
  );
}

function DeclineButton({ id, token }: { id: number; token: string | null }) {
  const queryClient = useQueryClient();
  return (
    <Button
      variant="outline"
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
    <section aria-labelledby="mine" className="mt-4 flex flex-col gap-4">
      <h2 id="mine" className="text-xl font-semibold">
        Permintaanmu
      </h2>
      {isPending ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : mine.length === 0 ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-dashed bg-card p-7">
          <p className="min-w-72 flex-1 leading-relaxed text-batu">
            Belum ada. Saat kamu butuh biaya berobat, ajukan di sini dan anggota yang siap membantu langsung diberi
            tahu.
          </p>
          <Link href="/ajukan" className={buttonVariants({ variant: "outline" })}>
            Ajukan bantuan
          </Link>
        </div>
      ) : (
        <ul className="rounded-xl border bg-card">
          {mine.map((r, i) => (
            <li key={r.id} className={cn("flex flex-wrap items-center gap-4 p-5", i > 0 && "border-t")}>
              <div className="flex min-w-60 flex-1 flex-col gap-1.5">
                <Link href={`/permintaan/${r.id}`} className="font-semibold hover:underline">
                  {r.title ?? `Permintaan nomor ${r.id}`}
                </Link>
                <span className="tabular text-[13px] text-batu">
                  {formatWhzd(r.collected)} dari {formatWhzd(r.amount)} WHZD terkumpul
                </span>
              </div>
              <StatusBadge request={r} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LatestNews() {
  const { data } = useNotifications(5);
  const now = useNow();
  return (
    <aside aria-labelledby="news" className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
      <h2 id="news" className="text-xl font-semibold">
        Kabar terbaru
      </h2>
      {data && data.length === 0 && <p className="text-batu">Belum ada kabar.</p>}
      <ul className="flex flex-col">
        {(data ?? []).map((n) => (
          <li key={n.id} className="flex gap-3 border-b py-4">
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
              <span className="text-[13px] leading-relaxed text-batu">
                {n.description} {timeAgo(n.createdAt, now)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/notifikasi" className="font-semibold underline underline-offset-4">
        Semua kabar
      </Link>
    </aside>
  );
}

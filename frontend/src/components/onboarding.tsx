"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { Check, HandHeart, IdCard, UserRoundPlus, Wallet } from "lucide-react";
import { useConfig } from "wagmi";
import { writeContract } from "wagmi/actions";

import { ProfileForm } from "@/components/profile-form";
import { TestnetNotice, useFaucet } from "@/components/top-up";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, type Member } from "@/lib/api";
import { registry } from "@/lib/contracts";
import { formatWhzd } from "@/lib/format";
import { keys, useMe } from "@/lib/queries";
import { phaseLabel, useTx } from "@/lib/tx";
import { cn } from "@/lib/utils";

type StepId = "join" | "profile" | "balance" | "ready";

const stepList: { id: StepId; title: string; icon: typeof Check }[] = [
  { id: "join", title: "Daftar jadi anggota", icon: UserRoundPlus },
  { id: "profile", title: "Isi profil", icon: IdCard },
  { id: "balance", title: "Isi saldo", icon: Wallet },
  { id: "ready", title: "Siap membantu", icon: HandHeart },
];

/** Joining, one step at a time: register, profile, balance, Ready. Each step says why it exists. */
export function Onboarding() {
  const { data: me } = useMe();
  const [readyLater, setReadyLater] = useState(false);
  if (!me) return null;

  const done: Record<StepId, boolean> = {
    join: me.chain.registered,
    profile: !!me.profile?.displayName,
    balance: BigInt(me.chain.faucetClaimed) > 0n || BigInt(me.chain.balance) > 0n,
    ready: me.chain.ready || readyLater,
  };
  const current = stepList.find((s) => !done[s.id])?.id;
  const index = current ? stepList.findIndex((s) => s.id === current) : stepList.length;

  return (
    <div className="mx-auto grid max-w-245 gap-10 md:grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl leading-tight font-extrabold text-pandan">Gabung di Whitzard</h1>
          <p className="text-batu">Empat langkah singkat. Kamu bisa berhenti dan lanjut kapan saja.</p>
        </div>
        <ol className="flex flex-col gap-1">
          {stepList.map((step, i) => (
            <li
              key={step.id}
              aria-current={step.id === current ? "step" : undefined}
              className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", step.id === current && "bg-card shadow-sm")}
            >
              <span
                className={cn(
                  "tabular flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  done[step.id] ? "bg-pandan text-white" : step.id === current ? "border-2 border-pandan text-pandan" : "border text-batu",
                )}
              >
                {done[step.id] ? <Check aria-hidden="true" className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("font-semibold", !done[step.id] && step.id !== current && "text-batu")}>
                {step.title}
                {done[step.id] && <span className="sr-only"> (selesai)</span>}
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <section aria-live="polite" className="rounded-2xl border bg-card p-6 sm:p-10">
        {current && <p className="mb-6 text-sm font-semibold text-batu">Langkah {index + 1} dari {stepList.length}</p>}
        {current === "join" && <JoinStep me={me} />}
        {current === "profile" && <ProfileStep me={me} />}
        {current === "balance" && <BalanceStep me={me} />}
        {current === "ready" && <ReadyStep me={me} onLater={() => setReadyLater(true)} />}
        {!current && <Done ready={me.chain.ready} />}
      </section>
    </div>
  );
}

function StepHeader({ icon: Icon, title, children }: { icon: typeof Check; title: string; children: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4">
      <span aria-hidden="true" className="flex size-3.5 items-center justify-center rounded-2xl bg-pandan-soft text-pandan">
        <Icon className="size-1.75" />
      </span>
      <h2 className="text-3xl leading-tight font-extrabold">{title}</h2>
      <div className="flex max-w-35 flex-col gap-3 text-lg leading-relaxed text-batu">{children}</div>
    </div>
  );
}

function JoinStep({ me }: { me: Member }) {
  const config = useConfig();
  const tx = useTx();
  return (
    <>
      <StepHeader icon={UserRoundPlus} title="Daftar jadi anggota">
        <p>
          Alamat dompetmu dicatat di daftar anggota Whitzard di blockchain. Cukup sekali, dan dari situ kamu bisa
          membantu anggota lain dan mengajukan bantuan.
        </p>
      </StepHeader>
      <Button
        size="lg"
        disabled={tx.busy}
        onClick={() =>
          void tx.run({
            send: () => writeContract(config, { ...registry, functionName: "register" }),
            synced: async () => (await api.member(me.address)).profile !== null,
            success: "Kamu sudah terdaftar sebagai anggota.",
            invalidate: [keys.member(me.address)],
          })
        }
      >
        {tx.busy ? phaseLabel[tx.phase] : "Daftar sekarang"}
      </Button>
      <TxNote />
    </>
  );
}

function ProfileStep({ me }: { me: Member }) {
  return (
    <>
      <StepHeader icon={IdCard} title="Kenalkan dirimu">
        <p>Supaya anggota lain tahu siapa yang mereka bantu, dan siapa yang membantu mereka.</p>
      </StepHeader>
      <ProfileForm me={me} submitLabel="Simpan dan lanjut" />
    </>
  );
}

function BalanceStep({ me }: { me: Member }) {
  const { tx, canClaim, wait, claim } = useFaucet(me);
  return (
    <>
      <StepHeader icon={Wallet} title="Isi saldo">
        <p>
          Iuran dibayar dengan token WHZD. Saldomu sekarang <strong className="tabular text-arang">{formatWhzd(me.chain.balance)} WHZD</strong>.
        </p>
      </StepHeader>
      <div className="mb-6 flex flex-col gap-4">
        <TestnetNotice />
        <p className="text-batu">
          Ambil 100 WHZD gratis dari faucet uji coba. Kamu bisa mengambil lagi setiap 24 jam lewat tombol saldo di atas,
          sampai 1.000 WHZD.
        </p>
      </div>
      {canClaim ? (
        <Button size="lg" disabled={tx.busy} onClick={() => void claim()}>
          {tx.busy ? phaseLabel[tx.phase] : "Ambil 100 WHZD gratis"}
        </Button>
      ) : (
        <p className="rounded-2xl bg-muted p-4 text-batu">{wait}</p>
      )}
      <TxNote />
    </>
  );
}

function ReadyStep({ me, onLater }: { me: Member; onLater: () => void }) {
  const config = useConfig();
  const tx = useTx();
  return (
    <>
      <StepHeader icon={HandHeart} title="Nyalakan siap membantu">
        <p>
          Saat siap membantu menyala, kamu ikut dihitung setiap kali ada anggota yang mengajukan bantuan, dan kamu
          diberi tahu berapa bagianmu.
        </p>
        <p>Kamu tetap bebas memilih membantu atau tidak di setiap permintaan, dan bisa mematikannya kapan saja di beranda.</p>
      </StepHeader>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={tx.busy}
          onClick={() =>
            void tx.run({
              send: () => writeContract(config, { ...registry, functionName: "setReady", args: [true] }),
              synced: async () => (await api.member(me.address)).chain.ready,
              success: "Kamu siap membantu.",
              invalidate: [keys.member(me.address), keys.proof],
            })
          }
        >
          {tx.busy ? phaseLabel[tx.phase] : "Nyalakan"}
        </Button>
        <Button size="lg" variant="ghost" disabled={tx.busy} onClick={onLater}>
          Nanti saja
        </Button>
      </div>
      <TxNote />
    </>
  );
}

function Done({ ready }: { ready: boolean }) {
  return (
    <div className="flex flex-col items-start gap-6">
      <span aria-hidden="true" className="grid size-16 grid-cols-2 gap-1.5">
        <span className="rounded-lg bg-pandan" />
        <span className="rounded-lg bg-pandan" />
        <span className="rounded-lg bg-pandan" />
        <span className="share-fill rounded-lg bg-kunyit" />
      </span>
      <div className="flex flex-col gap-3">
        <h2 className="text-[31px] leading-tight font-extrabold">Selamat datang, kamu sudah jadi anggota.</h2>
        <p className="max-w-[56ch] text-lg leading-relaxed text-batu">
          {ready
            ? "Saat ada anggota yang butuh bantuan, permintaannya muncul di beranda dan kamu mendapat notifikasi."
            : "Nyalakan siap membantu di beranda saat kamu sudah siap ikut dihitung."}
        </p>
      </div>
      <Link href="/beranda" className={buttonVariants({ size: "lg" })}>
        Ke beranda
      </Link>
    </div>
  );
}

function TxNote() {
  return (
    <p className="mt-6 text-sm leading-relaxed text-batu">
      Dompetmu akan meminta konfirmasi transaksi. Biayanya dibayar dengan ETH uji, bukan uang sungguhan.
    </p>
  );
}

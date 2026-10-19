"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Fuel, HandHeart, IdCard, ShieldCheck, UserRoundPlus, Wallet } from "lucide-react";
import type { Address } from "viem";
import { useBalance, useConfig } from "wagmi";
import { writeContract } from "wagmi/actions";
import { sepolia } from "wagmi/chains";

import { ProfileForm } from "@/components/profile-form";
import { Swap } from "@/components/swap";
import { SEPOLIA_FAUCET, TestnetNotice, useFaucet } from "@/components/top-up";
import { Button, buttonVariants } from "@/components/ui/button";
import { api, type Member } from "@/lib/api";
import { registry } from "@/lib/contracts";
import { formatWhzd, shortAddress } from "@/lib/format";
import { keys, useMe } from "@/lib/queries";
import { phaseLabel, useTx } from "@/lib/tx";
import { useChanged } from "@/lib/use-changed";
import { cn } from "@/lib/utils";
import { chain } from "@/lib/wagmi";

type StepId = "join" | "profile" | "balance" | "ready";

const stepList: { id: StepId; title: string; hint: string; icon: typeof Check }[] = [
  { id: "join", title: "Daftar jadi anggota", hint: "Sekali saja, tercatat di blockchain", icon: UserRoundPlus },
  { id: "profile", title: "Isi profil", hint: "Supaya sesama anggota mengenalmu", icon: IdCard },
  { id: "balance", title: "Isi saldo", hint: "100 WHZD gratis untuk uji coba", icon: Wallet },
  { id: "ready", title: "Siap membantu", hint: "Ikut dihitung saat ada permintaan", icon: HandHeart },
];

/** Joining, one step at a time: register, profile, balance, Ready. Each step says why it exists. */
export function Onboarding() {
  const { data: me } = useMe();
  return me ? <Steps me={me} /> : null;
}

function Steps({ me }: { me: Member }) {
  const [readyLater, setReadyLater] = useState(false);
  const done: Record<StepId, boolean> = {
    join: me.chain.registered,
    profile: !!me.profile?.displayName,
    balance: BigInt(me.chain.faucetClaimed) > 0n || BigInt(me.chain.balance) > 0n,
    ready: me.chain.ready || readyLater,
  };
  const current = stepList.find((s) => !done[s.id])?.id;
  const index = current ? stepList.findIndex((s) => s.id === current) : stepList.length;
  const stepChanged = useChanged(current);

  return (
    <div className="mx-auto grid max-w-245 gap-8 md:grid-cols-[280px_1fr] md:gap-12 lg:gap-16">
      <aside className="flex flex-col gap-8 md:sticky md:top-28 md:self-start">
        <div className="flex flex-col gap-2">
          <h1 className="text-[31px] leading-tight font-extrabold text-pandan sm:text-4xl">Gabung di Whitzard</h1>
          <p className="leading-relaxed text-batu">Empat langkah singkat. Kamu bisa berhenti dan lanjut kapan saja.</p>
        </div>

        {/* Desktop: the full path, with a line that fills in as steps are done. */}
        <ol className="hidden flex-col md:flex">
          {stepList.map((step, i) => {
            const isDone = done[step.id];
            const isCurrent = step.id === current;
            return (
              <li key={step.id} aria-current={isCurrent ? "step" : undefined} className="relative flex gap-4 pb-8 last:pb-0">
                {i < stepList.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-11 bottom-1.5 left-4.75 w-0.5 rounded-full transition-colors duration-500 ease-out",
                      isDone ? "bg-pandan" : "bg-garis",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "tabular relative flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-[background-color,border-color,color,box-shadow] duration-300 ease-out",
                    isDone
                      ? "bg-pandan text-white"
                      : isCurrent
                        ? "border-2 border-pandan bg-card text-pandan shadow-[0_0_0_5px_var(--color-pandan-soft)]"
                        : "border-2 border-garis bg-card text-batu",
                  )}
                >
                  {isDone ? <Check aria-hidden="true" className="size-4.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5 pt-1">
                  <span className={cn("font-bold", !isDone && !isCurrent && "text-batu")}>
                    {step.title}
                    {isDone && <span className="sr-only"> (selesai)</span>}
                  </span>
                  <span className="text-sm leading-snug text-batu">{step.hint}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </aside>

      <section aria-live="polite" className="rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgb(23_48_42/0.04),0_12px_32px_-12px_rgb(23_48_42/0.12)] sm:p-10">
        {current && <Progress index={index} done={done} />}
        {/* Keyed on the step, so each new step settles in instead of replacing the last one abruptly. */}
        <div key={current ?? "done"} className={stepChanged ? "settle-in" : undefined}>
          {current === "join" && <JoinStep me={me} />}
          {current === "profile" && <ProfileStep me={me} />}
          {current === "balance" && <BalanceStep me={me} />}
          {current === "ready" && <ReadyStep me={me} onLater={() => setReadyLater(true)} />}
          {!current && <Done ready={me.chain.ready} />}
        </div>
      </section>
    </div>
  );
}

/** "Step 2 of 4", plus a segmented bar on phones, where the step list in the sidebar is hidden. */
function Progress({ index, done }: { index: number; done: Record<StepId, boolean> }) {
  return (
    <div className="mb-8 flex flex-col gap-3">
      <div aria-hidden="true" className="flex gap-1.5 md:hidden">
        {stepList.map((step, i) => (
          <span key={step.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-garis">
            <span
              className={cn(
                "block h-full origin-left rounded-full transition-[scale,background-color] duration-500 ease-out",
                done[step.id] ? "bg-pandan" : i === index ? "bg-kunyit" : "scale-x-0",
              )}
            />
          </span>
        ))}
      </div>
      <p className="text-sm font-semibold text-batu">
        Langkah {index + 1} dari {stepList.length}
        <span className="md:hidden"> · {stepList[index].title}</span>
      </p>
    </div>
  );
}

function StepHeader({ icon: Icon, title, children }: { icon: typeof Check; title: string; children: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-5">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-xl bg-pandan-soft text-pandan">
        <Icon className="size-7" strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-3">
        <h2 className="text-[28px] leading-tight font-extrabold sm:text-3xl">{title}</h2>
        <div className="flex max-w-[52ch] flex-col gap-3 text-lg leading-relaxed text-batu">{children}</div>
      </div>
    </div>
  );
}

function JoinStep({ me }: { me: Member }) {
  const config = useConfig();
  const tx = useTx();
  // Registering costs a little Sepolia ETH for gas. While the wallet has none, keep checking, so
  // coming back from the faucet unlocks the button without a reload.
  const { data: eth } = useBalance({
    address: me.address as Address,
    chainId: chain.id,
    query: { refetchInterval: (q) => (q.state.data?.value === 0n ? 8_000 : false) },
  });
  const needsEth = chain.id === sepolia.id && eth?.value === 0n;

  return (
    <>
      <StepHeader icon={UserRoundPlus} title="Daftar jadi anggota">
        <p>
          Alamat dompetmu dicatat di daftar anggota Whitzard di blockchain. Cukup sekali, dan dari situ kamu bisa
          membantu anggota lain dan mengajukan bantuan.
        </p>
      </StepHeader>
      {needsEth && <GetEth address={me.address} />}
      <Button
        size="lg"
        disabled={tx.busy || needsEth}
        className="w-full sm:w-auto"
        onClick={() =>
          void tx.run({
            send: () => writeContract(config, { ...registry, functionName: "register" }),
            synced: async () => (await api.member(me.address)).profile !== null,
            success: "Kamu sudah terdaftar sebagai anggota.",
            invalidate: [keys.member(me.address)],
          })
        }
      >
        <Swap>{tx.busy ? phaseLabel[tx.phase] : "Daftar sekarang"}</Swap>
      </Button>
      <TxNote />
    </>
  );
}

/** A wallet with no test ETH can't pay gas, so step 1 starts with a trip to Google's free faucet. */
function GetEth({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="settle-in mb-6 flex flex-col gap-5 rounded-2xl border p-5 sm:p-6">
      <div className="flex gap-4">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-kunyit-soft text-kunyit-ink">
          <Fuel className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-bold">Dompetmu belum punya ETH {chain.name}</p>
          <p className="text-sm leading-relaxed text-batu">
            Setiap transaksi, termasuk mendaftar, butuh sedikit ETH uji untuk biaya jaringan. Ambil gratis dari faucet
            Google dulu, lalu kembali ke sini.
          </p>
        </div>
      </div>

      <ol className="flex flex-col gap-3 text-sm leading-relaxed">
        <li className="flex flex-col gap-2">
          <span>
            <span className="font-semibold">1.</span> Salin alamat dompetmu.
          </span>
          <button
            type="button"
            onClick={() => void copy()}
            className="pressable flex h-11 items-center justify-between gap-3 rounded-full border bg-muted pr-2 pl-4 text-left hover:bg-accent"
          >
            <span className="tabular truncate font-mono text-[13px]">{shortAddress(address)}</span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[13px] font-semibold text-pandan">
              {copied ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : <Copy aria-hidden="true" className="size-3.5" />}
              <Swap>{copied ? "Tersalin" : "Salin"}</Swap>
            </span>
          </button>
        </li>
        <li>
          <span className="font-semibold">2.</span> Buka faucet, pilih jaringan {chain.name}, tempel alamatnya, lalu kirim.
        </li>
      </ol>

      <a
        href={SEPOLIA_FAUCET}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ size: "lg", className: "w-full sm:w-auto sm:self-start" })}
      >
        Buka faucet ETH Google
        <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
      </a>

      <p role="status" className="flex items-center gap-2.5 text-sm text-batu">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-kunyit motion-safe:animate-pulse" />
        Menunggu ETH masuk. Tombol daftar aktif sendiri begitu ETH-nya sampai.
      </p>
    </div>
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
        <p>Iuran dibayar dengan token WHZD. Ambil 100 WHZD gratis dari faucet uji coba untuk mulai.</p>
      </StepHeader>
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl border p-5">
          <span className="text-sm font-semibold text-batu">Saldomu sekarang</span>
          <span className="tabular text-2xl font-extrabold tracking-tight">{formatWhzd(me.chain.balance)} WHZD</span>
        </div>
        <TestnetNotice />
        <p className="text-sm leading-relaxed text-batu">
          Kamu bisa mengambil lagi setiap 24 jam lewat tombol saldo di atas, sampai 1.000 WHZD.
        </p>
      </div>
      {canClaim ? (
        <Button size="lg" disabled={tx.busy} className="w-full sm:w-auto" onClick={() => void claim()}>
          <Swap>{tx.busy ? phaseLabel[tx.phase] : "Ambil 100 WHZD gratis"}</Swap>
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          size="lg"
          disabled={tx.busy}
          className="w-full sm:w-auto"
          onClick={() =>
            void tx.run({
              send: () => writeContract(config, { ...registry, functionName: "setReady", args: [true] }),
              synced: async () => (await api.member(me.address)).chain.ready,
              success: "Kamu siap membantu.",
              invalidate: [keys.member(me.address), keys.proof],
            })
          }
        >
          <Swap>{tx.busy ? phaseLabel[tx.phase] : "Nyalakan"}</Swap>
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
        <h2 className="text-[28px] leading-tight font-extrabold sm:text-3xl">Selamat datang, kamu sudah jadi anggota.</h2>
        <p className="max-w-[56ch] text-lg leading-relaxed text-batu">
          {ready
            ? "Saat ada anggota yang butuh bantuan, permintaannya muncul di beranda dan kamu mendapat notifikasi."
            : "Nyalakan siap membantu di beranda saat kamu sudah siap ikut dihitung."}
        </p>
      </div>
      <Link href="/beranda" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}>
        Ke beranda
      </Link>
    </div>
  );
}

function TxNote() {
  return (
    <p className="mt-5 flex gap-2.5 text-sm leading-relaxed text-batu">
      <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      Dompetmu akan meminta konfirmasi transaksi. Biayanya dibayar dengan ETH uji, bukan uang sungguhan.
    </p>
  );
}

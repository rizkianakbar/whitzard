"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { useConfig, useReadContract } from "wagmi";
import { writeContract } from "wagmi/actions";
import { parseEther, parseEventLogs } from "viem";
import { toast } from "sonner";

import { ShareGrid } from "@/components/share-grid";
import { BusyLabel } from "@/components/tx-label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { escrow, registry } from "@/lib/contracts";
import { errorMessage } from "@/lib/errors";
import { formatWhzd } from "@/lib/format";
import { keys, useMe, useProof } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { phaseLabel, useTx } from "@/lib/tx";
import { useFieldErrors } from "@/lib/use-field-errors";
import { cn } from "@/lib/utils";

const DAY = 24 * 60 * 60;
// The short ones are for demos and testing (the contract's minimum is 5 minutes).
const durations: { seconds: number; label: string; demo?: boolean }[] = [
  { seconds: 5 * 60, label: "5 menit", demo: true },
  { seconds: 10 * 60, label: "10 menit", demo: true },
  { seconds: DAY, label: "1 hari" },
  { seconds: 3 * DAY, label: "3 hari" },
  { seconds: 7 * DAY, label: "7 hari" },
  { seconds: 14 * DAY, label: "14 hari" },
];
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export function RequestForm() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-160 flex-col gap-2.5">
        <h1 className="text-[39px] leading-tight font-extrabold text-pandan">Ajukan bantuan</h1>
        <p className="leading-relaxed text-batu">
          Ceritakan kebutuhanmu dan lampirkan tagihan. Anggota yang sedang siap membantu akan diberi tahu, dan
          masing-masing diminta bagian yang sama.
        </p>
      </div>
      <Eligible />
    </div>
  );
}

function Eligible() {
  const { data: me } = useMe();
  const { data: proof, isPending } = useProof();
  if (isPending || !me) return <Skeleton className="h-96 w-full rounded-3xl" />;
  if (!me.chain.registered) {
    return (
      <Blocked title="Daftar dulu sebagai anggota">
        <Link href="/gabung" className="underline underline-offset-4">Daftar di sini</Link>. Hanya perlu sekali.
      </Blocked>
    );
  }
  if (!proof?.canOpenRequest) {
    return (
      <Blocked title="Kamu belum bisa mengajukan">
        Setelah permintaan pertamamu, kamu perlu membantu satu permintaan anggota lain sebelum mengajukan lagi. Kalau
        permintaanmu masih berjalan, tunggu sampai waktunya habis.{" "}
        <Link href="/permintaan" className="underline underline-offset-4">
          Lihat permintaan yang bisa kamu bantu
        </Link>
        .
      </Blocked>
    );
  }
  return <Form proofId={BigInt(proof.proofId ?? 0)} meReady={me.chain.ready} />;
}

function Blocked({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex max-w-xl flex-col gap-3 rounded-3xl border bg-card p-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="leading-relaxed text-batu">{children}</p>
    </section>
  );
}

function Form({ proofId, meReady }: { proofId: bigint; meReady: boolean }) {
  const config = useConfig();
  const router = useRouter();
  const { token: session } = useSession();
  const tx = useTx();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState(durations.find((d) => d.label === "3 hari")!.seconds);
  const [file, setFile] = useState<File | null>(null);

  const { data: readyCount } = useReadContract({ ...registry, functionName: "readyCount" });
  const members = readyCount === undefined ? undefined : Number(readyCount) - (meReady ? 1 : 0);
  const amountWei = parseAmount(amount);
  const share = amountWei && members && members > 0 ? amountWei / BigInt(members) : null;

  const { errors, validateAll, change, blur } = useFieldErrors({ title, description, amount, file }, (field, v) => {
    switch (field) {
      case "title":
        if (!v.title.trim()) return "Isi judul permintaan.";
        return v.title.trim().length > 120 ? "Judul paling banyak 120 karakter." : null;
      case "description":
        return v.description.trim() ? null : "Ceritakan untuk apa dana ini.";
      case "amount":
        if (members !== undefined && members <= 0) return "Belum ada anggota lain yang siap membantu.";
        return parseAmount(v.amount) ? null : "Isi jumlah dalam WHZD, misalnya 300.";
      case "file":
        if (!v.file) return "Lampirkan tagihan atau surat dokter.";
        return v.file.size > MAX_BYTES ? "Dokumen lebih dari 10 MB." : null;
    }
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateAll() || !file || !amountWei) return;

    let evidenceHash: `0x${string}`;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("description", description.trim());
      form.set("file", file);
      evidenceHash = (await api.createDraft(session!, form)).evidenceHash;
    } catch (error) {
      toast.error(errorMessage(error));
      return;
    } finally {
      setUploading(false);
    }

    let id: bigint | undefined;
    const receipt = await tx.run({
      send: () =>
        writeContract(config, {
          ...escrow,
          functionName: "openRequest",
          args: [amountWei, BigInt(duration), evidenceHash, proofId],
        }),
      synced: async (receipt) => {
        id ??= parseEventLogs({ abi: escrow.abi, eventName: "RequestOpened", logs: receipt.logs })[0]?.args.id;
        return id !== undefined && (await api.request(Number(id), session)).request.id === Number(id);
      },
      success: "Permintaanmu sudah dikirim ke anggota yang siap membantu.",
      invalidate: [["requests"], keys.proof],
    });
    if (receipt && id !== undefined) router.push(`/permintaan/${id}`);
  };

  const busy = uploading || tx.busy;
  const status = uploading ? "Mengunggah dokumen" : tx.busy ? phaseLabel[tx.phase] : null;

  return (
    <div className="flex flex-wrap items-start gap-10">
      <form
        noValidate
        onSubmit={submit}
        className="flex min-w-0 flex-[999_1_560px] flex-col gap-7 rounded-3xl border bg-card p-6 sm:p-8"
      >
        <Field id="title" label="Judul" error={errors.title}>
          <Input
            id="title"
            value={title}
            maxLength={120}
            onChange={(e) => {
              setTitle(e.target.value);
              change("title", e.target.value);
            }}
            onBlur={() => blur("title")}
            aria-invalid={!!errors.title}
          />
        </Field>

        <Field id="description" label="Ceritamu" hint="Apa yang terjadi, dan untuk apa dana ini. Tidak perlu menyebut diagnosis lengkap." error={errors.description}>
          <Textarea
            id="description"
            rows={5}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              change("description", e.target.value);
            }}
            onBlur={() => blur("description")}
            aria-invalid={!!errors.description}
          />
        </Field>

        <div className="flex flex-wrap gap-6">
          <Field id="amount" label="Jumlah yang dibutuhkan" error={errors.amount} className="flex-[1_1_220px]">
            <div className="flex h-12 items-center gap-2 rounded-xl border bg-card px-3.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring">
              <input
                id="amount"
                inputMode="decimal"
                placeholder="300"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  change("amount", e.target.value);
                }}
                onBlur={() => blur("amount")}
                aria-invalid={!!errors.amount}
                className="tabular min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none"
              />
              <span className="font-medium text-batu">WHZD</span>
            </div>
          </Field>
          <fieldset className="flex flex-[2_1_320px] flex-col gap-2">
            <legend className="mb-2 font-semibold">Lama pengumpulan</legend>
            <div className="flex flex-wrap gap-2">
              {durations.map((d) => (
                <label
                  key={d.seconds}
                  className={cn(
                    "flex h-12 cursor-pointer items-center gap-2 rounded-full border px-4 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                    duration === d.seconds && "border-2 border-pandan bg-pandan-soft font-semibold",
                  )}
                >
                  <input
                    type="radio"
                    name="duration"
                    className="accent-pandan"
                    checked={duration === d.seconds}
                    onChange={() => setDuration(d.seconds)}
                  />
                  {d.label}
                  {d.demo && (
                    <span className="rounded-full bg-kunyit-soft px-2 py-0.5 text-[11px] font-semibold text-kunyit-ink">Demo</span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <Field id="file" label="Dokumen bukti" error={errors.file}>
          <label
            htmlFor="file"
            className="flex cursor-pointer flex-wrap items-center gap-4 rounded-2xl border border-dashed border-[#a7b8af] bg-embun p-6 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
          >
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl border bg-card">
              <Upload className="size-5" />
            </span>
            <span className="flex min-w-60 flex-1 flex-col gap-1">
              <span className="font-semibold">{file ? file.name : "Pilih tagihan atau surat dokter"}</span>
              <span className="text-[13px] leading-relaxed text-batu">
                PDF atau foto, maksimal 10 MB. Hanya anggota yang diminta membantu yang bisa melihatnya.
              </span>
            </span>
            <input id="file" type="file" accept={ACCEPT} className="sr-only" onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                setFile(picked);
                change("file", picked, { commit: true });
              }}
            />
          </label>
        </Field>

        <div className="flex flex-wrap items-center gap-4 border-t pt-6">
          <Button type="submit" size="lg" disabled={busy}>
            <BusyLabel busy={status} wallet={!uploading && tx.phase === "wallet"}>
              Ajukan permintaan
            </BusyLabel>
          </Button>
          <span className="min-w-64 flex-1 text-[13px] leading-relaxed text-batu">
            Dokumen diunggah dulu, lalu kamu menandatangani satu transaksi di dompet. Setelah dikirim, jumlah dan bukti
            tidak bisa diubah.
          </span>
        </div>
      </form>

      <aside aria-label="Pratinjau bagian" className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
        <h2 className="text-xl font-bold">Yang akan diminta ke anggota</h2>
        <div className="flex flex-col gap-4.5 rounded-3xl border bg-card p-6">
          {members !== undefined && members > 0 && (
            <ShareGrid size={Math.min(members, 48)} contributed={0} declined={0} className="grid-cols-[repeat(auto-fill,minmax(24px,1fr))]" />
          )}
          <div className="flex flex-col gap-1">
            <span className="tabular text-[31px] font-bold tracking-tight">{share ? `${formatWhzd(share)} WHZD` : "Isi jumlah"}</span>
            <span className="text-[13px] leading-relaxed text-batu">
              {members === undefined
                ? "Menghitung anggota yang siap membantu"
                : members > 0
                  ? `per anggota, dari ${members} anggota yang siap membantu saat ini`
                  : "Belum ada anggota lain yang siap membantu"}
            </span>
          </div>
          <ul className="flex flex-col gap-2.5 text-[13px] leading-relaxed">
            <li>Dana diteruskan kepadamu saat waktu habis, berapa pun yang terkumpul.</li>
            <li>Kamu bisa membatalkan sebelum waktu habis. Iuran dikembalikan ke anggota.</li>
            <li>Jumlah anggota dikunci saat kamu mengirim, jadi bagian di atas bisa sedikit berubah.</li>
          </ul>
        </div>
        <Link href="/permintaan" className={cn(buttonVariants({ variant: "link" }), "self-start px-0")}>
          Lihat permintaan lain
        </Link>
      </aside>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className="text-base font-semibold">
        {label}
      </Label>
      {hint && <p className="text-[13px] text-batu">{hint}</p>}
      {children}
      {error && (
        <p role="alert" className="text-[13px] font-medium text-bata-ink">
          {error}
        </p>
      )}
    </div>
  );
}

/** "300", "12,5" or "12.5" → wei, or null if not a positive number. */
function parseAmount(value: string): bigint | null {
  const normalized = value.trim().replace(/\./g, (m, i, s) => (s.includes(",") ? "" : m)).replace(",", ".");
  if (!/^\d+(\.\d{1,18})?$/.test(normalized)) return null;
  const wei = parseEther(normalized);
  return wei > 0n ? wei : null;
}

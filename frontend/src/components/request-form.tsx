"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HandHeart, Hourglass, Upload, UserRound } from "lucide-react";
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
import { type Dict, useI18n } from "@/lib/i18n";
import { keys, useEligibility, useMe, useProof } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { useTx } from "@/lib/tx";
import { useFieldErrors } from "@/lib/use-field-errors";
import { cn } from "@/lib/utils";

const DAY = 24 * 60 * 60;
// The short ones are for demos and testing (the contract's minimum is 5 minutes).
const durations: { seconds: number; demo?: boolean }[] = [
  { seconds: 5 * 60, demo: true },
  { seconds: 10 * 60, demo: true },
  { seconds: DAY },
  { seconds: 3 * DAY },
  { seconds: 7 * DAY },
  { seconds: 14 * DAY },
];
const durationLabel = (seconds: number, t: Dict) =>
  seconds < DAY ? t.ask.duration.minutes(seconds / 60) : t.ask.duration.days(seconds / DAY);
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export function RequestForm() {
  const { t } = useI18n();
  const text = t.ask;
  const { data: me } = useMe();
  const { data: proof } = useProof();
  const eligibility = useEligibility();
  if (!me || !proof || !eligibility) return <Skeleton className="h-96 w-full rounded-3xl" />;

  // Nothing to fill in yet: one centred message saying why, and where to go instead.
  if (!me.chain.registered) {
    return (
      <Blocked icon={<UserRound className="size-6" />} title={text.blocked.register.title} href="/gabung" cta={text.blocked.register.cta}>
        {text.blocked.register.body}
      </Blocked>
    );
  }
  if (!eligibility.can) {
    return eligibility.reason === "running" ? (
      <Blocked
        icon={<Hourglass className="size-6" />}
        title={text.blocked.running.title}
        href={`/permintaan/${eligibility.requestId}`}
        cta={text.blocked.running.cta}
      >
        {text.blocked.running.body}
      </Blocked>
    ) : (
      <Blocked
        icon={<HandHeart className="size-6" />}
        title={text.blocked.helpFirst.title}
        href="/permintaan"
        cta={text.blocked.helpFirst.cta}
      >
        {text.blocked.helpFirst.body}
      </Blocked>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-160 flex-col gap-2.5">
        <h1 className="text-[39px] leading-tight font-extrabold text-pandan">{text.title}</h1>
        <p className="leading-relaxed text-batu">{text.intro}</p>
      </div>
      <Form proofId={BigInt(proof.proofId ?? 0)} meReady={me.chain.ready} />
    </div>
  );
}

function Blocked({
  icon,
  title,
  href,
  cta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 rounded-3xl border bg-card px-6 py-10 text-center sm:mt-8 sm:px-10 sm:py-12">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-pandan-soft text-pandan">
        {icon}
      </span>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-batu">{t.ask.title}</span>
        <h1 className="text-[25px] leading-tight font-extrabold text-balance">{title}</h1>
      </div>
      <p className="max-w-[44ch] leading-relaxed text-pretty text-batu">{children}</p>
      <Link href={href} className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}>
        {cta}
      </Link>
    </section>
  );
}

function Form({ proofId, meReady }: { proofId: bigint; meReady: boolean }) {
  const config = useConfig();
  const { t, fmt } = useI18n();
  const text = t.ask;
  const router = useRouter();
  const { token: session } = useSession();
  const tx = useTx();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState(3 * DAY);
  const [file, setFile] = useState<File | null>(null);

  const { data: readyCount } = useReadContract({ ...registry, functionName: "readyCount" });
  const members = readyCount === undefined ? undefined : Number(readyCount) - (meReady ? 1 : 0);
  const amountWei = parseAmount(amount);
  const share = amountWei && members && members > 0 ? amountWei / BigInt(members) : null;

  const { errors, validateAll, change, blur } = useFieldErrors({ title, description, amount, file }, (field, v) => {
    switch (field) {
      case "title":
        if (!v.title.trim()) return text.errors.title;
        return v.title.trim().length > 120 ? text.errors.titleLong : null;
      case "description":
        return v.description.trim() ? null : text.errors.description;
      case "amount":
        if (members !== undefined && members <= 0) return text.errors.noMembers;
        return parseAmount(v.amount) ? null : text.errors.amount;
      case "file":
        if (!v.file) return text.errors.file;
        return v.file.size > MAX_BYTES ? text.errors.fileLarge : null;
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
      toast.error(errorMessage(error, t));
      return;
    } finally {
      setUploading(false);
    }

    let id: bigint | undefined;
    const receipt = await tx.run({
      prompt: {
        title: text.prompt(fmt.whzd(amountWei)),
        detail: t.wallet.call("Escrow", "openRequest", text.promptDetail),
      },
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
      success: text.success,
      invalidate: [["requests"], keys.proof],
    });
    if (receipt && id !== undefined) router.push(`/permintaan/${id}`);
  };

  const busy = uploading || tx.busy;
  const status = uploading ? text.uploading : tx.busy ? t.tx.phase[tx.phase] : null;

  return (
    <div className="flex flex-wrap items-start gap-10">
      <form
        noValidate
        onSubmit={submit}
        className="flex min-w-0 flex-[999_1_560px] flex-col gap-7 rounded-3xl border bg-card p-6 sm:p-8"
      >
        <Field id="title" label={text.fields.title} error={errors.title}>
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

        <Field id="description" label={text.fields.story} hint={text.fields.storyHint} error={errors.description}>
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
          <Field id="amount" label={text.fields.amount} error={errors.amount} className="flex-[1_1_220px]">
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
            <legend className="mb-2 font-semibold">{text.fields.duration}</legend>
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
                  {durationLabel(d.seconds, t)}
                  {d.demo && (
                    <span className="rounded-full bg-kunyit-soft px-2 py-0.5 text-[11px] font-semibold text-kunyit-ink">Demo</span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <Field id="file" label={text.fields.file} error={errors.file}>
          <label
            htmlFor="file"
            className="flex cursor-pointer flex-wrap items-center gap-4 rounded-2xl border border-dashed border-[#a7b8af] bg-embun p-6 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
          >
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl border bg-card">
              <Upload className="size-5" />
            </span>
            <span className="flex min-w-60 flex-1 flex-col gap-1">
              <span className="font-semibold">{file ? file.name : text.fields.filePick}</span>
              <span className="text-[13px] leading-relaxed text-batu">{text.fields.fileHint}</span>
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
              {text.submit}
            </BusyLabel>
          </Button>
          <span className="min-w-64 flex-1 text-[13px] leading-relaxed text-batu">{text.submitNote}</span>
        </div>
      </form>

      <aside aria-label={text.preview.label} className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
        <h2 className="text-xl font-bold">{text.preview.title}</h2>
        <div className="flex flex-col gap-4.5 rounded-3xl border bg-card p-6">
          {members !== undefined && members > 0 && (
            <ShareGrid size={Math.min(members, 48)} contributed={0} declined={0} className="grid-cols-[repeat(auto-fill,minmax(24px,1fr))]" />
          )}
          <div className="flex flex-col gap-1">
            <span className="tabular text-[31px] font-bold tracking-tight">{share ? `${fmt.whzd(share)} WHZD` : text.preview.fillAmount}</span>
            <span className="text-[13px] leading-relaxed text-batu">
              {members === undefined
                ? text.preview.counting
                : members > 0
                  ? text.preview.perMember(members)
                  : text.preview.noMembers}
            </span>
          </div>
          <ul className="flex flex-col gap-2.5 text-[13px] leading-relaxed">
            {text.preview.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        <Link href="/permintaan" className={cn(buttonVariants({ variant: "link" }), "self-start px-0")}>
          {text.preview.others}
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

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HandHeart, Hourglass, Upload, UserRound } from "lucide-react";
import { useConfig, useReadContract } from "wagmi";
import { writeContract } from "wagmi/actions";
import { Controller, useForm, useWatch } from "react-hook-form";
import { parseEventLogs } from "viem";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPT, type AskValues, askSchema, DAY, durationLabel, durations, parseAmount } from "@/features/ask/ask.lib";
import { useMe, useProof } from "@/features/members/members.hooks";
import { useEligibility } from "@/features/requests/requests.hooks";
import { ShareGrid } from "@/features/requests/share-grid";
import { useSession } from "@/features/session/session.hooks";
import { BusyLabel } from "@/features/tx/tx-label";
import { useTx } from "@/features/tx/tx.hooks";
import { api } from "@/lib/api";
import { escrow, registry } from "@/lib/contracts";
import { useI18n } from "@/lib/i18n";
import { keys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

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
      <Blocked icon={<UserRound className="size-6" />} title={text.blocked.register.title} href="/join" cta={text.blocked.register.cta}>
        {text.blocked.register.body}
      </Blocked>
    );
  }
  if (!eligibility.can) {
    return eligibility.reason === "running" ? (
      <Blocked
        icon={<Hourglass className="size-6" />}
        title={text.blocked.running.title}
        href={`/requests/${eligibility.requestId}`}
        cta={text.blocked.running.cta}
      >
        {text.blocked.running.body}
      </Blocked>
    ) : (
      <Blocked
        icon={<HandHeart className="size-6" />}
        title={text.blocked.helpFirst.title}
        href="/requests"
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

type BlockedProps = {
  icon: React.ReactNode;
  title: string;
  href: string;
  cta: string;
  children: React.ReactNode;
};

function Blocked(props: BlockedProps) {
  const { icon, title, href, cta, children } = props;
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

type FormProps = {
  proofId: bigint;
  meReady: boolean;
};

function Form(props: FormProps) {
  const { proofId, meReady } = props;
  const config = useConfig();
  const { t, fmt } = useI18n();
  const text = t.ask;
  const router = useRouter();
  const { token: session } = useSession();
  const tx = useTx();

  const { data: readyCount } = useReadContract({ ...registry, functionName: "readyCount" });
  const members = readyCount === undefined ? undefined : Number(readyCount) - (meReady ? 1 : 0);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(askSchema(t, members)),
    defaultValues: { title: "", description: "", amount: "", duration: String(3 * DAY) },
  });
  const amountWei = parseAmount(useWatch({ control, name: "amount" }));
  const file = useWatch({ control, name: "file" });
  const share = amountWei && members && members > 0 ? amountWei / BigInt(members) : null;

  // The story and document go to the backend first; the chain only stores the document's hash.
  const upload = useMutation({
    mutationFn: (values: AskValues) => {
      const form = new FormData();
      form.set("title", values.title);
      form.set("description", values.description);
      form.set("file", values.file);
      return api.createDraft(session!, form);
    },
  });

  const submit = async (values: AskValues) => {
    // A failed upload is toasted by the query client; there is nothing to send then.
    const draft = await upload.mutateAsync(values).catch(() => null);
    if (!draft) return;

    let id: bigint | undefined;
    const receipt = await tx.run({
      prompt: {
        title: text.prompt(fmt.whzd(values.amount)),
        detail: t.wallet.call("Escrow", "openRequest", text.promptDetail),
      },
      send: () =>
        writeContract(config, {
          ...escrow,
          functionName: "openRequest",
          args: [values.amount, BigInt(values.duration), draft.evidenceHash, proofId],
        }),
      synced: async (receipt) => {
        id ??= parseEventLogs({ abi: escrow.abi, eventName: "RequestOpened", logs: receipt.logs })[0]?.args.id;
        return id !== undefined && (await api.request(Number(id), session)).request.id === Number(id);
      },
      success: text.success,
      invalidate: [keys.requests, keys.proof],
    });
    if (receipt && id !== undefined) router.push(`/requests/${id}`);
  };

  const status = upload.isPending ? text.uploading : tx.busy ? t.tx.phase[tx.phase] : null;

  return (
    <div className="flex flex-wrap items-start gap-10">
      <form
        noValidate
        onSubmit={handleSubmit(submit)}
        className="flex min-w-0 flex-[999_1_560px] flex-col gap-7 rounded-3xl border bg-card p-6 sm:p-8"
      >
        <Field id="title" label={text.fields.title} error={errors.title?.message}>
          <Input id="title" maxLength={120} aria-invalid={!!errors.title} {...register("title")} />
        </Field>

        <Field id="description" label={text.fields.story} hint={text.fields.storyHint} error={errors.description?.message}>
          <Textarea id="description" rows={5} aria-invalid={!!errors.description} {...register("description")} />
        </Field>

        <div className="flex flex-wrap gap-6">
          <Field id="amount" label={text.fields.amount} error={errors.amount?.message} className="flex-[1_1_220px]">
            <div className="flex h-12 items-center gap-2 rounded-xl border bg-card px-3.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring">
              <input
                id="amount"
                inputMode="decimal"
                placeholder="300"
                aria-invalid={!!errors.amount}
                className="tabular min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none"
                {...register("amount")}
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
                  className="flex h-12 cursor-pointer items-center gap-2 rounded-full border px-4 has-checked:border-2 has-checked:border-pandan has-checked:bg-pandan-soft has-checked:font-semibold has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
                >
                  <input type="radio" value={String(d.seconds)} className="accent-pandan" {...register("duration")} />
                  {durationLabel(d.seconds, t)}
                  {d.demo && (
                    <span className="rounded-full bg-kunyit-soft px-2 py-0.5 text-[11px] font-semibold text-kunyit-ink">Demo</span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <Field id="file" label={text.fields.file} error={errors.file?.message}>
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
            <Controller
              control={control}
              name="file"
              render={({ field }) => (
                <input
                  id="file"
                  ref={field.ref}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  aria-invalid={!!errors.file}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(e.target.files?.[0])}
                />
              )}
            />
          </label>
        </Field>

        <div className="flex flex-wrap items-center gap-4 border-t pt-6">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            <BusyLabel busy={status} wallet={!upload.isPending && tx.phase === "wallet"}>
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
        <Link href="/requests" className={cn(buttonVariants({ variant: "link" }), "self-start px-0")}>
          {text.preview.others}
        </Link>
      </aside>
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
};

function Field(props: FieldProps) {
  const { id, label, hint, error, className, children } = props;
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

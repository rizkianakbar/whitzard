"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Fuel, HandHeart, IdCard, ShieldCheck, UserRoundPlus, Wallet } from "lucide-react";
import { sepolia } from "viem/chains";
import { useBalance, useConfig } from "wagmi";
import { writeContract } from "wagmi/actions";

import { Swap } from "@/components/swap";
import { Button, buttonVariants } from "@/components/ui/button";
import { useMe } from "@/features/members/members.hooks";
import { hasProfile, hasTokens } from "@/features/members/members.lib";
import { ProfileForm } from "@/features/profile/profile-form";
import { TestnetNotice } from "@/features/top-up/top-up";
import { useFaucet } from "@/features/top-up/top-up.hooks";
import { SEPOLIA_FAUCET } from "@/features/top-up/top-up.lib";
import { TxLabel } from "@/features/tx/tx-label";
import { useTx } from "@/features/tx/tx.hooks";
import { api, type Member } from "@/lib/api";
import { chain } from "@/lib/config";
import { registry } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { keys } from "@/lib/query-keys";
import { useChanged } from "@/lib/use-changed";
import { useCopy } from "@/lib/use-copy";
import { cn } from "@/lib/utils";

type StepId = "join" | "profile" | "balance" | "ready";

// Titles and hints: t.onboarding.steps[id].
const stepList: { id: StepId; icon: typeof Check }[] = [
  { id: "join", icon: UserRoundPlus },
  { id: "profile", icon: IdCard },
  { id: "balance", icon: Wallet },
  { id: "ready", icon: HandHeart },
];

/** Joining, one step at a time: register, profile, balance, Ready. Each step says why it exists. */
export function Onboarding() {
  const { data: me } = useMe();
  return me ? <Steps me={me} /> : null;
}

type StepsProps = {
  me: Member;
};

function Steps(props: StepsProps) {
  const { me } = props;
  const { t } = useI18n();
  const text = t.onboarding;
  const [readyLater, setReadyLater] = useState(false);
  const done: Record<StepId, boolean> = {
    join: me.chain.registered,
    profile: hasProfile(me),
    balance: hasTokens(me),
    ready: me.chain.ready || readyLater,
  };
  const current = stepList.find((s) => !done[s.id])?.id;
  const index = current ? stepList.findIndex((s) => s.id === current) : stepList.length;
  const stepChanged = useChanged(current);

  return (
    <div className="mx-auto grid max-w-245 gap-8 md:grid-cols-[280px_1fr] md:gap-12 lg:gap-16">
      <aside className="flex flex-col gap-8 md:sticky md:top-28 md:self-start">
        <div className="flex flex-col gap-2">
          <h1 className="text-[31px] leading-tight font-extrabold text-pandan sm:text-4xl">{text.title}</h1>
          <p className="leading-relaxed text-batu">{text.intro}</p>
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
                    {text.steps[step.id].title}
                    {isDone && <span className="sr-only">{text.done}</span>}
                  </span>
                  <span className="text-sm leading-snug text-batu">{text.steps[step.id].hint}</span>
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

type ProgressProps = {
  index: number;
  done: Record<StepId, boolean>;
};

/** "Step 2 of 4", plus a segmented bar on phones, where the step list in the sidebar is hidden. */
function Progress(props: ProgressProps) {
  const { index, done } = props;
  const { t } = useI18n();
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
        {t.onboarding.progress(index + 1, stepList.length)}
        <span className="md:hidden"> · {t.onboarding.steps[stepList[index].id].title}</span>
      </p>
    </div>
  );
}

type StepHeaderProps = {
  icon: typeof Check;
  title: string;
  children: ReactNode;
};

function StepHeader(props: StepHeaderProps) {
  const { icon: Icon, title, children } = props;
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

type JoinStepProps = {
  me: Member;
};

function JoinStep(props: JoinStepProps) {
  const { me } = props;
  const config = useConfig();
  const { t } = useI18n();
  const text = t.onboarding.join;
  const tx = useTx();
  // Registering costs a little Sepolia ETH for gas. While the wallet has none, keep checking, so
  // coming back from the faucet unlocks the button without a reload.
  const { data: eth } = useBalance({
    address: me.address,
    chainId: chain.id,
    query: { refetchInterval: (q) => (q.state.data?.value === 0n ? 8_000 : false) },
  });
  const needsEth = chain.id === sepolia.id && eth?.value === 0n;

  return (
    <>
      <StepHeader icon={UserRoundPlus} title={t.onboarding.steps.join.title}>
        <p>{text.body}</p>
      </StepHeader>
      {needsEth && <GetEth address={me.address} />}
      <Button
        size="lg"
        disabled={tx.busy || needsEth}
        className="w-full sm:w-auto"
        onClick={() =>
          void tx.run({
            prompt: { title: text.prompt, detail: t.wallet.call("Registry", "register", text.promptDetail) },
            send: () => writeContract(config, { ...registry, functionName: "register" }),
            synced: async () => (await api.member(me.address)).profile !== null,
            success: text.success,
            invalidate: [keys.member(me.address)],
          })
        }
      >
        <TxLabel tx={tx}>{text.cta}</TxLabel>
      </Button>
      <TxNote />
    </>
  );
}

type GetEthProps = {
  address: string;
};

/** A wallet with no test ETH can't pay gas, so step 1 starts with a trip to Google's free faucet. */
function GetEth(props: GetEthProps) {
  const { address } = props;
  const { t } = useI18n();
  const text = t.onboarding.eth;
  const { copied, copy } = useCopy();

  return (
    <div className="settle-in mb-6 flex flex-col gap-5 rounded-2xl border p-5 sm:p-6">
      <div className="flex gap-4">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-kunyit-soft text-kunyit-ink">
          <Fuel className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-bold">{text.title(chain.name)}</p>
          <p className="text-sm leading-relaxed text-batu">{text.body}</p>
        </div>
      </div>

      <ol className="flex flex-col gap-3 text-sm leading-relaxed">
        <li className="flex flex-col gap-2">
          <span>
            <span className="font-semibold">1.</span> {text.copy}
          </span>
          <button
            type="button"
            onClick={() => void copy(address)}
            className="pressable flex h-11 items-center justify-between gap-3 rounded-full border bg-muted pr-2 pl-4 text-left hover:bg-accent"
          >
            <span className="tabular truncate font-mono text-[13px]">{shortAddress(address)}</span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[13px] font-semibold text-pandan">
              {copied ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : <Copy aria-hidden="true" className="size-3.5" />}
              <Swap>{copied ? t.common.copied : t.common.copy}</Swap>
            </span>
          </button>
        </li>
        <li>
          <span className="font-semibold">2.</span> {text.paste(chain.name)}
        </li>
      </ol>

      <a
        href={SEPOLIA_FAUCET}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ size: "lg", className: "w-full sm:w-auto sm:self-start" })}
      >
        {text.open}
        <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
      </a>

      <p role="status" className="flex items-center gap-2.5 text-sm text-batu">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-kunyit motion-safe:animate-pulse" />
        {text.waiting}
      </p>
    </div>
  );
}

type ProfileStepProps = {
  me: Member;
};

function ProfileStep(props: ProfileStepProps) {
  const { me } = props;
  const { t } = useI18n();
  const text = t.onboarding.profile;
  return (
    <>
      <StepHeader icon={IdCard} title={text.title}>
        <p>{text.body}</p>
      </StepHeader>
      <ProfileForm me={me} submitLabel={text.save} />
    </>
  );
}

type BalanceStepProps = {
  me: Member;
};

function BalanceStep(props: BalanceStepProps) {
  const { me } = props;
  const { t, fmt } = useI18n();
  const text = t.onboarding.balance;
  const { tx, canClaim, wait, claim } = useFaucet(me);
  return (
    <>
      <StepHeader icon={Wallet} title={t.common.topUp}>
        <p>{text.body}</p>
      </StepHeader>
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl border p-5">
          <span className="text-sm font-semibold text-batu">{text.current}</span>
          <span className="tabular text-2xl font-extrabold tracking-tight">{fmt.whzd(me.chain.balance)} WHZD</span>
        </div>
        <TestnetNotice />
        <p className="text-sm leading-relaxed text-batu">{text.later}</p>
      </div>
      {canClaim ? (
        <Button size="lg" disabled={tx.busy} className="w-full sm:w-auto" onClick={() => void claim()}>
          <TxLabel tx={tx}>{t.topUp.claim}</TxLabel>
        </Button>
      ) : (
        <p className="rounded-2xl bg-muted p-4 text-batu">{wait}</p>
      )}
      <TxNote />
    </>
  );
}

type ReadyStepProps = {
  me: Member;
  onLater: () => void;
};

function ReadyStep(props: ReadyStepProps) {
  const { me, onLater } = props;
  const config = useConfig();
  const { t } = useI18n();
  const text = t.onboarding.ready;
  const tx = useTx();
  return (
    <>
      <StepHeader icon={HandHeart} title={text.title}>
        <p>{text.body}</p>
        <p>{text.free}</p>
      </StepHeader>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          size="lg"
          disabled={tx.busy}
          className="w-full sm:w-auto"
          onClick={() =>
            void tx.run({
              prompt: {
                title: t.dashboard.ready.promptOn,
                detail: t.wallet.call("Registry", "setReady", t.dashboard.ready.detailOn),
              },
              send: () => writeContract(config, { ...registry, functionName: "setReady", args: [true] }),
              synced: async () => {
                const m = await api.member(me.address);
                return m.chain.ready && !!m.profile?.ready;
              },
              success: t.dashboard.ready.successOn,
              invalidate: [keys.member(me.address), keys.proof],
            })
          }
        >
          <TxLabel tx={tx}>{text.cta}</TxLabel>
        </Button>
        <Button size="lg" variant="ghost" disabled={tx.busy} onClick={onLater}>
          {text.later}
        </Button>
      </div>
      <TxNote />
    </>
  );
}

type DoneProps = {
  ready: boolean;
};

function Done(props: DoneProps) {
  const { ready } = props;
  const { t } = useI18n();
  const text = t.onboarding.welcome;
  return (
    <div className="flex flex-col items-start gap-6">
      <span aria-hidden="true" className="grid size-16 grid-cols-2 gap-1.5">
        <span className="rounded-lg bg-pandan" />
        <span className="rounded-lg bg-pandan" />
        <span className="rounded-lg bg-pandan" />
        <span className="share-fill rounded-lg bg-kunyit" />
      </span>
      <div className="flex flex-col gap-3">
        <h2 className="text-[28px] leading-tight font-extrabold sm:text-3xl">{text.title}</h2>
        <p className="max-w-[56ch] text-lg leading-relaxed text-batu">{ready ? text.ready : text.notReady}</p>
      </div>
      <Link href="/home" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}>
        {text.cta}
      </Link>
    </div>
  );
}

function TxNote() {
  const { t } = useI18n();
  return (
    <p className="mt-5 flex gap-2.5 text-sm leading-relaxed text-batu">
      <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {t.onboarding.txNote}
    </p>
  );
}

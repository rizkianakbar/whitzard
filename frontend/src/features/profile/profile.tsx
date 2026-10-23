"use client";

import { Check, Copy } from "lucide-react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Avatar } from "@/features/members/member-avatar";
import { useMe } from "@/features/members/members.hooks";
import { callName } from "@/features/members/members.lib";
import { ProfileForm } from "@/features/profile/profile-form";
import { appConfig } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useCopy } from "@/lib/use-copy";
import { cn } from "@/lib/utils";

export function ProfilePage() {
  const { t, fmt } = useI18n();
  const text = t.profile;
  const { data: me } = useMe();
  const { copied, copy } = useCopy();
  if (!me) return <ProfileSkeleton />;
  const p = me.profile;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="flex flex-col gap-6 rounded-2xl bg-pandan-deep p-7 text-white">
        <Avatar address={me.address} profile={p} className="size-6 ring-4 ring-white/15" />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl leading-tight font-extrabold">{callName(p, t.common.member)}</h1>
          {p?.nickname && p.displayName && <span className="text-white/70">{p.displayName}</span>}
          {p?.city && <span className="text-white/70">{p.city}</span>}
        </div>
        <dl className="grid grid-cols-2 gap-2">
          <div className="flex flex-col-reverse gap-0.5 rounded-2xl bg-white/10 p-4">
            <dt className="text-sm text-white/70">{text.helped}</dt>
            <dd className="tabular text-[31px] leading-none font-extrabold">{p?.contributions ?? 0}</dd>
          </div>
          <div className="flex flex-col-reverse gap-0.5 rounded-2xl bg-white/10 p-4">
            <dt className="text-sm text-white/70">{text.requests}</dt>
            <dd className="tabular text-[31px] leading-none font-extrabold">{p?.requests ?? 0}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-white/70">{text.address}</span>
            <button type="button" onClick={() => void copy(me.address)} className="tabular flex items-center gap-2 self-start font-semibold hover:underline">
              {shortAddress(me.address)}
              {copied ? <Check aria-hidden="true" className="pop-in size-4" /> : <Copy aria-hidden="true" className="pop-in size-4" />}
              <span className="sr-only">{copied ? t.common.copied : text.copyAddress}</span>
            </button>
          </div>
          {p && (
            <div className="flex flex-col gap-1">
              <span className="text-white/70">{text.since}</span>
              <span className="font-semibold">{fmt.day(p.createdAt)}</span>
            </div>
          )}
          {appConfig.explorerUrl && (
            <a
              href={`${appConfig.explorerUrl}/address/${me.address}`}
              target="_blank"
              rel="noreferrer"
              className="self-start font-semibold text-kunyit underline underline-offset-4"
            >
              {t.common.onExplorer}
            </a>
          )}
        </div>
      </aside>

      <section aria-labelledby="edit" className="rounded-2xl border bg-card p-6 sm:p-10">
        <h2 id="edit" className="mb-8 text-2xl font-extrabold">
          {text.edit}
        </h2>
        <ProfileForm key={`${p?.displayName}-${p?.photo}`} me={me} submitLabel={text.save} />
      </section>
    </div>
  );
}

/** The profile page before the member has loaded: the same two cards, greyed out where data goes. */
export function ProfileSkeleton() {
  const { t } = useI18n();
  const text = t.profile;
  return (
    <div aria-busy="true" className="grid items-start gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="flex flex-col gap-6 rounded-2xl bg-pandan-deep p-7 text-white [--skeleton:rgb(255_255_255/0.15)]">
        <Skeleton className="size-6 rounded-full bg-white/15" />
        <SkeletonText className="w-40 text-2xl leading-tight font-extrabold" />
        <dl className="grid grid-cols-2 gap-2">
          <div className="flex flex-col-reverse gap-0.5 rounded-2xl bg-white/10 p-4">
            <dt className="text-sm text-white/70">{text.helped}</dt>
            <SkeletonText className="w-8 text-[31px] leading-none font-extrabold" />
          </div>
          <div className="flex flex-col-reverse gap-0.5 rounded-2xl bg-white/10 p-4">
            <dt className="text-sm text-white/70">{text.requests}</dt>
            <SkeletonText className="w-8 text-[31px] leading-none font-extrabold" />
          </div>
        </dl>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-white/70">{text.address}</span>
            <SkeletonText className="w-32 font-semibold" />
          </div>
        </div>
      </aside>

      <section className="rounded-2xl border bg-card p-6 sm:p-10">
        <h2 className="mb-8 text-2xl font-extrabold">{text.edit}</h2>
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-5">
            <Skeleton className="size-24 rounded-full" />
            <div className="flex min-w-52 flex-1 flex-col gap-1">
              <span className="font-semibold">{text.form.photo}</span>
              <span className="text-sm leading-relaxed text-batu">{text.form.photoHint}</span>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldSkeleton label={text.form.displayName} className="sm:col-span-2" />
            <FieldSkeleton label={text.form.nickname} hint={text.form.nicknameHint} />
            <FieldSkeleton label={text.form.email} hint={text.form.emailHint} />
            <FieldSkeleton label={text.form.city} hint={text.form.cityHint} />
            <FieldSkeleton label={text.form.birthDate} hint={text.form.birthDateHint} />
          </div>
          <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-batu">{text.form.note}</p>
          <Skeleton className="h-13 w-36 self-start rounded-full" />
        </div>
      </section>
    </div>
  );
}

type FieldSkeletonProps = {
  label: string;
  hint?: string;
  className?: string;
};

/** ProfileForm's Field with the input greyed out. */
function FieldSkeleton(props: FieldSkeletonProps) {
  const { label, hint, className } = props;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-base leading-none font-semibold">{label}</span>
      <Skeleton className="h-12 rounded-xl" />
      {hint && <p className="text-sm text-batu">{hint}</p>}
    </div>
  );
}

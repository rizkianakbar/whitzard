"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Avatar, callName } from "@/components/avatar";
import { ProfileForm } from "@/components/profile-form";
import { appConfig } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/queries";

export function ProfilePage() {
  const { t, fmt } = useI18n();
  const text = t.profile;
  const { data: me } = useMe();
  const [copied, setCopied] = useState(false);
  if (!me) return null;
  const p = me.profile;

  const copy = async () => {
    await navigator.clipboard.writeText(me.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
            <button type="button" onClick={() => void copy()} className="tabular flex items-center gap-2 self-start font-semibold hover:underline">
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

"use client";

import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { appConfig } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TxProofProps = {
  hash: string;
  label?: string;
  /** Just the hash as a link, for tight lists such as the history. */
  compact?: boolean;
  className?: string;
};

/**
 * A transaction as proof: its hash, always visible, linking to the public explorer so anyone can
 * check it without trusting Whitzard. Without an explorer (local chain) it is just the hash.
 */
export function TxProof(props: TxProofProps) {
  const { hash, label, compact, className } = props;
  const { t } = useI18n();
  const body = (
    <>
      <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0" />
      {!compact && <span>{label ?? t.txProof.label}</span>}
      <span className={cn("tabular font-mono text-[12px]", !compact && "opacity-80")}>{shortAddress(hash)}</span>
      {appConfig.explorerUrl && <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" />}
    </>
  );
  const style = compact
    ? cn("inline-flex items-center gap-1 font-semibold text-pandan underline-offset-4 hover:underline", className)
    : cn(
        "inline-flex max-w-full items-center gap-1.5 self-start rounded-full border border-pandan/20 bg-pandan-soft px-2.5 py-1 text-[12px] font-semibold text-pandan",
        className,
      );
  if (!appConfig.explorerUrl) return <span className={style} title={hash}>{body}</span>;
  return (
    <a
      href={`${appConfig.explorerUrl}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      title={t.txProof.open(hash)}
      className={cn(style, !compact && "pressable transition-colors hover:border-pandan/50 hover:bg-white")}
    >
      {body}
    </a>
  );
}

type AddressLinkProps = {
  address: string;
  children: React.ReactNode;
};

/** A contract or wallet address, linking to its page on the explorer. */
export function AddressLink(props: AddressLinkProps) {
  const { address, children } = props;
  if (!appConfig.explorerUrl) return <span>{children}</span>;
  return (
    <a
      href={`${appConfig.explorerUrl}/address/${address}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-0.5 font-semibold text-pandan underline underline-offset-4"
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
    </a>
  );
}

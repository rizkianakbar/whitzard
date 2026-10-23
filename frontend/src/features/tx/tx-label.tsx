"use client";

import { LoaderCircle, Wallet } from "lucide-react";

import { Swap } from "@/components/swap";
import type { TxPhase } from "@/features/tx/tx.lib";
import { useI18n } from "@/lib/i18n";

type BusyLabelProps = {
  busy: string | null;
  wallet?: boolean;
  children: string;
};

/**
 * A button label that becomes a loading state while work is in flight: a spinner while we wait on
 * the network, a wallet icon while we wait on the member (nothing is spinning then; it is their move).
 * data-busy keeps the disabled button at full opacity, so in-progress never looks like unavailable.
 */
export function BusyLabel(props: BusyLabelProps) {
  const { busy, wallet, children } = props;
  if (!busy) return <Swap>{children}</Swap>;
  return (
    <span data-busy="" className="inline-flex items-center gap-2">
      {wallet ? (
        <Wallet aria-hidden="true" className="size-4 motion-safe:animate-pulse" />
      ) : (
        <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
      )}
      <Swap>{busy}</Swap>
    </span>
  );
}

type TxLabelProps = {
  tx: { busy: boolean; phase: TxPhase };
  children: string;
};

/** BusyLabel for a useTx() transaction. */
export function TxLabel(props: TxLabelProps) {
  const { tx, children } = props;
  const { t } = useI18n();
  return (
    <BusyLabel busy={tx.busy ? t.tx.phase[tx.phase] : null} wallet={tx.phase === "wallet"}>
      {children}
    </BusyLabel>
  );
}

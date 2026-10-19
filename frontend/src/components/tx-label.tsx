"use client";

import { LoaderCircle, Wallet } from "lucide-react";

import { Swap } from "@/components/swap";
import { phaseLabel, type TxPhase } from "@/lib/tx";

/**
 * A button label that becomes a loading state while work is in flight: a spinner while we wait on
 * the network, a wallet icon while we wait on the member (nothing is spinning then; it is their move).
 * data-busy keeps the disabled button at full opacity, so in-progress never looks like unavailable.
 */
export function BusyLabel({ busy, wallet, children }: { busy: string | null; wallet?: boolean; children: string }) {
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

/** BusyLabel for a useTx() transaction. */
export function TxLabel({ tx, children }: { tx: { busy: boolean; phase: TxPhase }; children: string }) {
  return (
    <BusyLabel busy={tx.busy ? phaseLabel[tx.phase] : null} wallet={tx.phase === "wallet"}>
      {children}
    </BusyLabel>
  );
}

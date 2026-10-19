"use client";

import { useState } from "react";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { Hash, TransactionReceipt } from "viem";

import { errorMessage } from "@/lib/errors";

/** wallet → pending (mined?) → syncing (indexed by the backend?) → done. */
export type TxPhase = "idle" | "wallet" | "pending" | "syncing" | "done";

export const phaseLabel: Record<TxPhase, string> = {
  idle: "",
  wallet: "Konfirmasi di dompetmu",
  pending: "Menunggu dicatat di blockchain",
  syncing: "Memperbarui tampilan",
  done: "Tercatat",
};

/** Polls `check` until it returns true (e.g. the backend has indexed a transaction). */
export async function until(check: () => Promise<boolean>, timeoutMs = 45_000, intervalMs = 800): Promise<void> {
  const start = Date.now();
  while (!(await check().catch(() => false))) {
    if (Date.now() - start > timeoutMs) throw new Error("Transaksi tercatat, tapi tampilan belum diperbarui. Muat ulang sebentar lagi.");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

type RunOptions = {
  /** Sends the transaction (after any signatures) and returns its hash. */
  send: () => Promise<Hash>;
  /** Resolves true once the backend reflects the change; polled after the receipt. */
  synced?: (receipt: TransactionReceipt) => Promise<boolean>;
  /** Shown as a toast when everything is done. */
  success: string;
  /** Queries to refresh afterwards. */
  invalidate?: QueryKey[];
};

export function useTx() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<TxPhase>("idle");

  async function run({ send, synced, success, invalidate = [] }: RunOptions): Promise<TransactionReceipt | null> {
    try {
      setPhase("wallet");
      const hash = await send();
      setPhase("pending");
      const receipt = await waitForTransactionReceipt(config, { hash });
      if (receipt.status !== "success") throw new Error("Transaksi gagal di blockchain.");
      if (synced) {
        setPhase("syncing");
        await until(() => synced(receipt));
      }
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      setPhase("done");
      toast.success(success);
      return receipt;
    } catch (error) {
      setPhase("idle");
      toast.error(errorMessage(error));
      return null;
    }
  }

  return {
    phase,
    busy: phase === "wallet" || phase === "pending" || phase === "syncing",
    run,
    /** Lets a step before the transaction (e.g. a signature) show "confirm in your wallet". */
    setPhase,
    reset: () => setPhase("idle"),
  };
}

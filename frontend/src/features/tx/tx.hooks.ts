"use client";

import { useId, useState } from "react";
import { type QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { Hash, TransactionReceipt } from "viem";

import { dismissWalletPrompt, showWalletPrompt, type TxPhase, until, type WalletPrompt } from "@/features/tx/tx.lib";
import { useI18n } from "@/lib/i18n";

type RunOptions = {
  /** What the wallet is about to ask for, shown in the page while it is open. */
  prompt: WalletPrompt;
  /**
   * Sends the transaction (after any signatures) and returns its hash. A send with several wallet
   * steps (a signature, then the transaction) calls `step` before each one to update the prompt.
   */
  send: (step: (prompt: WalletPrompt) => void) => Promise<Hash>;
  /** Resolves true once the backend reflects the change; polled after the receipt. */
  synced?: (receipt: TransactionReceipt) => Promise<boolean>;
  /** Shown as a toast when everything is done. */
  success: string;
  /** Queries to refresh afterwards. */
  invalidate?: QueryKey[];
};

// Phase labels (t.tx.phase) are short enough for a button: what is happening for the member, not
// the chain mechanics.
export function useTx() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [phase, setPhase] = useState<TxPhase>("idle");
  const promptId = `wallet-${useId()}`;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ prompt, send, synced, invalidate = [] }: RunOptions) => {
      setPhase("wallet");
      showWalletPrompt(promptId, prompt);
      let hash: Hash;
      try {
        hash = await send((next) => showWalletPrompt(promptId, next));
      } finally {
        dismissWalletPrompt(promptId);
      }
      setPhase("pending");
      const receipt = await waitForTransactionReceipt(config, { hash });
      if (receipt.status !== "success") throw new Error(t.tx.failed);
      if (synced) {
        setPhase("syncing");
        await until(() => synced(receipt), t.tx.slowSync);
      }
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      return receipt;
    },
    onSuccess: (_receipt, { success }) => {
      setPhase("done");
      toast.success(success);
    },
    // The failure itself is toasted by the query client (see Providers).
    onError: () => setPhase("idle"),
  });

  /** Runs the transaction; resolves to its receipt, or null if any step failed or was refused. */
  const run = (options: RunOptions): Promise<TransactionReceipt | null> => mutateAsync(options).catch(() => null);

  return { phase, busy: isPending, run };
}

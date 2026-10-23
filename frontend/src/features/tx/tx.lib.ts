import { createElement } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

/** wallet → pending (mined?) → syncing (indexed by the backend?) → done. */
export type TxPhase = "idle" | "wallet" | "pending" | "syncing" | "done";

/**
 * What the member is about to approve in their wallet. A site can't put its own words in the
 * wallet's popup (or phishing sites would label a drain "claim reward"), so while the wallet is
 * open the page says what this step is and what the wallet will show for it.
 */
export type WalletPrompt = {
  /** The step in the member's words: "Bantu 30 WHZD" / "Chip in 30 WHZD". */
  title: string;
  /**
   * What the wallet will show and what it does. For a contract call it names the contract and
   * function as the wallet shows them: t.wallet.call("Escrow", "contribute", effect).
   */
  detail: string;
};

/** Shows (or, with the same id, updates) the prompt; it stays until dismissed. */
export function showWalletPrompt(id: string, prompt: WalletPrompt) {
  toast(prompt.title, {
    id,
    description: prompt.detail,
    duration: Infinity,
    icon: createElement(Wallet, { className: "size-4 text-pandan", "aria-hidden": true }),
  });
}

export function dismissWalletPrompt(id: string) {
  toast.dismiss(id);
}

/** Polls `check` until it returns true (e.g. the backend has indexed a transaction); throws `timeout` if it never does. */
export async function until(check: () => Promise<boolean>, timeout: string, timeoutMs = 45_000, intervalMs = 800): Promise<void> {
  const start = Date.now();
  while (!(await check().catch(() => false))) {
    if (Date.now() - start > timeoutMs) throw new Error(timeout);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

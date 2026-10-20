import { createElement } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

/**
 * What the member is about to approve in their wallet. A site can't put its own words in the
 * wallet's popup (or phishing sites would label a drain "claim reward"), so while the wallet is
 * open the page says what this step is and what the wallet will show for it.
 */
export type WalletPrompt = {
  /** The step in the member's words: "Bantu 30 WHZD" / "Chip in 30 WHZD". */
  title: string;
  /** What the wallet will show (contract and function, or the signature type) and what it does. */
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
// The detail for a contract call names the contract and function as the wallet shows them:
// t.wallet.call("Escrow", "contribute", effect).

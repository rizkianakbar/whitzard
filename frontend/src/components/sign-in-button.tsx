"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useConnect, useConnectors, useDisconnect } from "wagmi";
import { toast } from "sonner";
import type { Address } from "viem";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";
import { devAccounts } from "@/lib/wagmi";

/**
 * One step to sign in: connects a wallet if none is connected (the browser's EIP-6963 wallets, plus
 * local test accounts in dev), then asks it to sign the SIWE message. A refused signature disconnects
 * again, so the member is never left connected but signed out.
 */
export function SignInButton({ size }: { size?: "default" | "lg" }) {
  const connectors = useConnectors();
  const { mutateAsync: connect, isPending } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { address, signIn } = useSession();
  const [open, setOpen] = useState(false);
  const [signing, setSigning] = useState(false);

  const announced = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
  const browser = announced.length ? announced : connectors.filter((c) => c.id === "injected");
  const mocks = connectors.filter((c) => c.type === "mock");

  const sign = async (account?: Address) => {
    setSigning(true);
    try {
      await signIn(account);
    } catch (error) {
      disconnect();
      toast.error(errorMessage(error));
    } finally {
      setSigning(false);
    }
  };

  const choose = async (connector: (typeof connectors)[number]) => {
    let account: Address;
    try {
      [account] = (await connect({ connector })).accounts;
    } catch (error) {
      toast.error(errorMessage(error));
      return;
    }
    setOpen(false);
    await sign(account);
  };

  const label = signing ? "Tanda tangani di dompetmu" : "Masuk";

  // Already connected (wagmi reconnected on load, or the wallet switched accounts): only the signature is missing.
  if (address) {
    return (
      <Button size={size} disabled={signing} onClick={() => sign()}>
        {label}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} disabled={signing}>{label}</Button>} />
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Masuk dengan dompet</DialogTitle>
          <DialogDescription className="text-batu">
            Pilih dompetmu, lalu tanda tangani pesan masuk. Gratis, dan tidak mengirim transaksi apa pun. Whitzard
            tidak pernah memegang kuncimu.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {browser.map((connector) => (
            <li key={connector.uid}>
              <Button variant="outline" className="h-14 w-full justify-start gap-3 px-4" disabled={isPending} onClick={() => choose(connector)}>
                {connector.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={connector.icon} alt="" className="size-7 rounded-md" />
                ) : (
                  <Wallet aria-hidden="true" className="size-6" />
                )}
                {connector.id === "injected" ? "Dompet di browser" : connector.name}
              </Button>
            </li>
          ))}
        </ul>
        {browser.length === 0 && (
          <p className="text-sm text-batu">
            Belum ada dompet di browser ini. Pasang MetaMask atau dompet lain yang mendukung Sepolia, lalu muat ulang halaman.
          </p>
        )}
        {mocks.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-[13px] text-batu">Pengembangan lokal: akun uji dari node Hardhat.</p>
            <div className="grid grid-cols-2 gap-2">
              {mocks.map((connector, i) => (
                <Button key={connector.uid} variant="outline" size="default" disabled={isPending} onClick={() => choose(connector)}>
                  {devAccounts[i]?.name ?? connector.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

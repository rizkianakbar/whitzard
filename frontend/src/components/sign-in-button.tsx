"use client";

import { useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import { useConnect, useConnectors, useDisconnect } from "wagmi";
import { toast } from "sonner";
import type { Address } from "viem";

import { BusyLabel } from "@/components/tx-label";
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
export function SignInButton({ size, label: idle = "Masuk" }: { size?: "default" | "lg"; label?: string }) {
  const connectors = useConnectors();
  const { mutateAsync: connect, isPending } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { address, signIn } = useSession();
  const [open, setOpen] = useState(false);
  const [signing, setSigning] = useState(false);

  // wagmi always lists the generic injected connector; offer it only when a wallet actually injected
  // window.ethereum, or a member without a wallet gets a bare "Provider not found" on click. The
  // dialog content renders only on the client, so reading window here is safe.
  const announced = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
  const browser = announced.length
    ? announced
    : connectors.filter((c) => c.id === "injected" && typeof window !== "undefined" && "ethereum" in window);
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

  const label = (
    <BusyLabel busy={signing ? "Setujui di dompetmu" : null} wallet>
      {idle}
    </BusyLabel>
  );

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
      <DialogContent className="gap-5 rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Masuk dengan dompet</DialogTitle>
          <DialogDescription className="text-batu">
            Pilih dompetmu, lalu tanda tangani pesan masuk. Gratis, dan tidak mengirim transaksi apa pun. Whitzard
            tidak pernah memegang kuncimu.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {browser.map((connector) => (
            <li key={connector.uid}>
              <Button variant="outline" className="h-14 w-full justify-start gap-3 rounded-2xl px-4" disabled={isPending} onClick={() => choose(connector)}>
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
        {browser.length === 0 && <NoWallet />}
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

/** For newcomers to web3: what a wallet is and how to get one, on a computer or a phone. */
function NoWallet() {
  // MetaMask's mobile app opens this link in its built-in browser, where the wallet is available.
  const inApp = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-muted p-4 text-sm leading-relaxed">
      <div className="flex flex-col gap-1">
        <p className="font-bold">Belum ada dompet di browser ini</p>
        <p className="text-batu">
          Dompet kripto adalah aplikasi gratis yang menyimpan akunmu di Whitzard. Tidak perlu email atau kata sandi: kamu
          masuk dengan menyetujui pesan di dompet. Pasang sekali, sekitar 2 menit.
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        <li>
          <span className="font-semibold">Di komputer:</span> pasang ekstensi MetaMask, buat dompet baru, lalu muat ulang
          halaman ini.
          <Button
            variant="outline"
            className="mt-2 w-full gap-2"
            render={<a href="https://metamask.io/download/" target="_blank" rel="noreferrer" />}
            nativeButton={false}
          >
            Pasang MetaMask
            <ExternalLink aria-hidden="true" />
          </Button>
        </li>
        <li>
          <span className="font-semibold">Di HP:</span> pasang aplikasi MetaMask, lalu{" "}
          <a href={inApp} className="font-semibold text-pandan underline underline-offset-4">
            buka Whitzard di dalam aplikasinya
          </a>
          .
        </li>
      </ol>
      <p className="text-[13px] text-batu">
        Simpan baik-baik frasa pemulihan yang diberikan MetaMask. Whitzard tidak bisa memulihkan dompetmu.
      </p>
    </div>
  );
}

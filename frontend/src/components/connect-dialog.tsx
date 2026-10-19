"use client";

import { Wallet } from "lucide-react";
import { useConnect, useConnectors } from "wagmi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/errors";
import { devAccounts } from "@/lib/wagmi";

/** Lists the wallets the browser announces (EIP-6963), plus local test accounts in dev. */
export function ConnectButton({ label = "Hubungkan dompet", size }: { label?: string; size?: "default" | "lg" }) {
  const connectors = useConnectors();
  const { mutateAsync: connect, isPending } = useConnect();

  const announced = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
  const browser = announced.length ? announced : connectors.filter((c) => c.id === "injected");
  const mocks = connectors.filter((c) => c.type === "mock");

  const choose = async (connector: (typeof connectors)[number]) => {
    try {
      await connect({ connector });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button size={size}>{label}</Button>} />
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Hubungkan dompet</DialogTitle>
          <DialogDescription className="text-batu">
            Dompet menyimpan tokenmu dan menandatangani setiap iuran. Whitzard tidak pernah memegang kuncimu.
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

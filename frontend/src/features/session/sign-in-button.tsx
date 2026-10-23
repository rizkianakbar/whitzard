"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Wallet } from "lucide-react";
import type { Address } from "viem";
import { type Connector, useConnect, useConnectors, useDisconnect } from "wagmi";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSession } from "@/features/session/session.hooks";
import { BusyLabel } from "@/features/tx/tx-label";
import { useI18n } from "@/lib/i18n";

type SignInButtonProps = {
  size?: "default" | "lg";
  label?: string;
  className?: string;
};

/**
 * One step to sign in: connects a wallet if none is connected (the browser's EIP-6963 wallets, plus
 * local test accounts in dev), then asks it to sign the SIWE message. A refused signature disconnects
 * again, so the member is never left connected but signed out. Failures are toasted by the query
 * client (see Providers).
 */
export function SignInButton(props: SignInButtonProps) {
  const { size, label, className } = props;
  const { t } = useI18n();
  const idle = label ?? t.signIn.button;
  const connectors = useConnectors();
  const { mutate: connect, isPending } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { address, signIn } = useSession();
  const [open, setOpen] = useState(false);
  const { mutate: sign, isPending: signing } = useMutation({
    mutationFn: (account?: Address) => signIn(account),
    onError: () => disconnect(),
  });

  // wagmi always lists the generic injected connector; offer it only when a wallet actually injected
  // window.ethereum, or a member without a wallet gets a bare "Provider not found" on click. The
  // dialog content renders only on the client, so reading window here is safe.
  const announced = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
  const browser = announced.length
    ? announced
    : connectors.filter((c) => c.id === "injected" && typeof window !== "undefined" && "ethereum" in window);
  const mocks = connectors.filter((c) => c.type === "mock");

  const choose = (connector: Connector) =>
    connect(
      { connector },
      {
        onSuccess: ({ accounts: [account] }) => {
          setOpen(false);
          sign(account);
        },
      },
    );

  const content = (
    <BusyLabel busy={signing ? t.tx.phase.wallet : null} wallet>
      {idle}
    </BusyLabel>
  );

  // Already connected (wagmi reconnected on load, or the wallet switched accounts): only the signature is missing.
  if (address) {
    return (
      <Button size={size} disabled={signing} className={className} onClick={() => sign()}>
        {content}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} disabled={signing} className={className}>{content}</Button>} />
      <DialogContent className="gap-5 rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t.signIn.withWallet}</DialogTitle>
          <DialogDescription className="text-batu">{t.signIn.intro}</DialogDescription>
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
                {connector.id === "injected" ? t.signIn.browserWallet : connector.name}
              </Button>
            </li>
          ))}
        </ul>
        {browser.length === 0 && <NoWallet />}
        {mocks.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-[13px] text-batu">{t.signIn.devAccounts}</p>
            <div className="grid grid-cols-2 gap-2">
              {mocks.map((connector, i) => (
                <Button key={connector.uid} variant="outline" size="default" disabled={isPending} onClick={() => choose(connector)}>
                  {t.signIn.devAccount(i + 1)}
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
  const { t } = useI18n();
  const text = t.signIn.noWallet;
  // MetaMask's mobile app opens this link in its built-in browser, where the wallet is available.
  const inApp = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-muted p-4 text-sm leading-relaxed">
      <div className="flex flex-col gap-1">
        <p className="font-bold">{text.title}</p>
        <p className="text-batu">{text.body}</p>
      </div>
      <ol className="flex flex-col gap-3">
        <li>
          <span className="font-semibold">{text.desktopLabel}</span> {text.desktop}
          <Button
            variant="outline"
            className="mt-2 w-full gap-2"
            render={<a href="https://metamask.io/download/" target="_blank" rel="noreferrer" />}
            nativeButton={false}
          >
            {text.install}
            <ExternalLink aria-hidden="true" />
          </Button>
        </li>
        <li>
          <span className="font-semibold">{text.phoneLabel}</span>{" "}
          {text.phone(
            <a href={inApp} className="font-semibold text-pandan underline underline-offset-4">
              {text.phoneLink}
            </a>,
          )}
        </li>
      </ol>
      <p className="text-[13px] text-batu">{text.recovery}</p>
    </div>
  );
}

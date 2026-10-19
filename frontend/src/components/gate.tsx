"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { useState } from "react";

import { ConnectButton } from "@/components/connect-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import { useSession } from "@/lib/session";

/** Renders children only for a signed-in wallet; otherwise asks to connect or sign in. */
export function SignedIn({ children, reason }: { children: ReactNode; reason: string }) {
  const { status, signIn } = useSession();
  const [busy, setBusy] = useState(false);

  if (status === "loading") return <Skeleton className="h-40 w-full rounded-xl" />;
  if (status === "signed-in") return children;

  const signedOut = status === "signed-out";
  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-xl border bg-card p-8">
      <h2 className="text-xl font-semibold">{signedOut ? "Masuk dengan dompetmu" : "Hubungkan dompet untuk mulai"}</h2>
      <p className="leading-relaxed text-batu">
        {signedOut
          ? "Dompetmu akan meminta tanda tangan untuk membuktikan alamat ini milikmu. Gratis, dan tidak mengirim transaksi apa pun."
          : reason}
      </p>
      <div>
        {signedOut ? (
          <Button
            size="lg"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await signIn();
              } catch (error) {
                toast.error(errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Tanda tangani di dompetmu" : "Masuk"}
          </Button>
        ) : (
          <ConnectButton size="lg" />
        )}
      </div>
    </section>
  );
}

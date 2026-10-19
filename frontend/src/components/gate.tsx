"use client";

import type { ReactNode } from "react";

import { SignInButton } from "@/components/sign-in-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";

/** Renders children only for a signed-in wallet; otherwise asks to sign in. */
export function SignedIn({ children, reason }: { children: ReactNode; reason: string }) {
  const { status } = useSession();

  if (status === "loading") return <Skeleton className="h-40 w-full rounded-xl" />;
  if (status === "signed-in") return children;

  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-xl border bg-card p-8">
      <h2 className="text-xl font-semibold">Masuk dengan dompetmu</h2>
      <p className="leading-relaxed text-batu">
        {reason} Dompetmu akan meminta tanda tangan untuk membuktikan alamat ini milikmu. Gratis, dan tidak mengirim
        transaksi apa pun.
      </p>
      <div>
        <SignInButton size="lg" />
      </div>
    </section>
  );
}

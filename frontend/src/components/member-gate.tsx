"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/lib/queries";
import { useSession } from "@/lib/session";

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-64 rounded-full" />
      <Skeleton className="h-48 w-full rounded-3xl" />
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  );
}

/**
 * Members-only page content: sends signed-out visitors to the landing page and non-members to
 * /gabung (`joining` marks /gabung itself). Lives inside each page, not the layout, so the layout
 * always renders its page and Next.js can validate every route for instant navigation.
 */
export function MemberGate({ joining = false, children }: { joining?: boolean; children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession();
  const { data: me } = useMe();
  const registered = me?.chain.registered;

  useEffect(() => {
    if (status === "disconnected" || status === "signed-out") router.replace("/");
    else if (registered === false && !joining) router.replace("/gabung");
  }, [status, registered, joining, router]);

  if (status !== "signed-in" || !me || (!registered && !joining)) return <PageSkeleton />;
  return children;
}

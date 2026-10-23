"use client";

import { type ReactNode, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { membersQuery, useMe } from "@/features/members/members.hooks";
import { requestsQuery } from "@/features/requests/requests.hooks";
import { useSession } from "@/features/session/session.hooks";

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-64 rounded-full" />
      <Skeleton className="h-48 w-full rounded-3xl" />
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  );
}

type MemberGateProps = {
  joining?: boolean;
  /** The page's own skeleton, so the swap to real content doesn't move anything. */
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Members-only page content: sends signed-out visitors to the landing page and non-members to
 * /join (`joining` marks /join itself). Lives inside each page, not the layout, so the layout
 * always renders its page and Next.js can validate every route for instant navigation.
 */
export function MemberGate(props: MemberGateProps) {
  const { joining = false, fallback = <PageSkeleton />, children } = props;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status, address, token } = useSession();
  const { data: me } = useMe();
  const registered = me?.chain.registered;

  // The page's own queries only start once it renders, after the member has loaded. Start the
  // ones most pages need now, alongside it: names everywhere, and the two request lists.
  useEffect(() => {
    if (!token) return;
    void queryClient.prefetchQuery(membersQuery(address, token));
    void queryClient.prefetchQuery(requestsQuery("for-me", address, token));
    void queryClient.prefetchQuery(requestsQuery("mine", address, token));
  }, [queryClient, address, token]);

  useEffect(() => {
    if (status === "disconnected" || status === "signed-out") router.replace("/");
    else if (registered === false && !joining) router.replace("/join");
  }, [status, registered, joining, router]);

  if (status !== "signed-in" || !me || (!registered && !joining)) return fallback;
  return children;
}

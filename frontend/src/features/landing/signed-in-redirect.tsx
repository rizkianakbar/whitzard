"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/features/session/session.hooks";

/** Signed-in members skip the landing page. */
export function SignedInRedirect() {
  const router = useRouter();
  const { status } = useSession();
  useEffect(() => {
    if (status === "signed-in") router.replace("/home");
  }, [status, router]);
  return null;
}

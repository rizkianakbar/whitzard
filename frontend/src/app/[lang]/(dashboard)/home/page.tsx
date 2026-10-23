import type { Metadata } from "next";

import { Dashboard, DashboardSkeleton } from "@/features/dashboard/dashboard";
import { MemberGate } from "@/features/members/member-gate";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("home");

export default function Page() {
  return (
    <MemberGate fallback={<DashboardSkeleton />}>
      <Dashboard />
    </MemberGate>
  );
}

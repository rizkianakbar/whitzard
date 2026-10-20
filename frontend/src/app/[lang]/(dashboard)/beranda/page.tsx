import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";
import { MemberGate } from "@/components/member-gate";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("home");

export default function Page() {
  return (
    <MemberGate>
      <Dashboard />
    </MemberGate>
  );
}

import type { Metadata } from "next";

import { MemberGate } from "@/components/member-gate";
import { Onboarding } from "@/components/onboarding";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("join");

export default function Page() {
  return (
    <MemberGate joining>
      <Onboarding />
    </MemberGate>
  );
}

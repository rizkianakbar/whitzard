import type { Metadata } from "next";

import { MemberGate } from "@/components/member-gate";
import { Onboarding } from "@/components/onboarding";

export const metadata: Metadata = { title: "Gabung" };

export default function Page() {
  return (
    <MemberGate joining>
      <Onboarding />
    </MemberGate>
  );
}

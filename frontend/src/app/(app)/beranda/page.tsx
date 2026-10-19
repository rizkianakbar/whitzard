import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";
import { MemberGate } from "@/components/member-gate";

export const metadata: Metadata = { title: "Beranda" };

export default function Page() {
  return (
    <MemberGate>
      <Dashboard />
    </MemberGate>
  );
}

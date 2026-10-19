import type { Metadata } from "next";

import { MemberGate } from "@/components/member-gate";
import { RequestForm } from "@/components/request-form";

export const metadata: Metadata = { title: "Ajukan bantuan" };

export default function Page() {
  return (
    <MemberGate>
      <RequestForm />
    </MemberGate>
  );
}

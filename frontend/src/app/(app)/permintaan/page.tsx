import type { Metadata } from "next";

import { MemberGate } from "@/components/member-gate";
import { RequestList } from "@/components/request-list";

export const metadata: Metadata = { title: "Permintaan" };

export default function Page() {
  return (
    <MemberGate>
      <RequestList />
    </MemberGate>
  );
}

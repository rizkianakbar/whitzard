import type { Metadata } from "next";

import { MemberGate } from "@/components/member-gate";
import { RequestList } from "@/components/request-list";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("requests");

export default function Page() {
  return (
    <MemberGate>
      <RequestList />
    </MemberGate>
  );
}

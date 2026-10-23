import type { Metadata } from "next";

import { MemberGate } from "@/features/members/member-gate";
import { RequestList } from "@/features/requests/requests";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("requests");

export default function Page() {
  return (
    <MemberGate>
      <RequestList />
    </MemberGate>
  );
}

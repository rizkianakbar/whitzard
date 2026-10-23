import type { Metadata } from "next";

import { MemberGate } from "@/features/members/member-gate";
import { RequestList, RequestListSkeleton } from "@/features/requests/requests";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("requests");

export default function Page() {
  return (
    <MemberGate fallback={<RequestListSkeleton />}>
      <RequestList />
    </MemberGate>
  );
}

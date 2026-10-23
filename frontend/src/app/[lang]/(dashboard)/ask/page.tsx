import type { Metadata } from "next";

import { RequestForm } from "@/features/ask/ask";
import { MemberGate } from "@/features/members/member-gate";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("ask");

export default function Page() {
  return (
    <MemberGate>
      <RequestForm />
    </MemberGate>
  );
}

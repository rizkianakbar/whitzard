import type { Metadata } from "next";

import { MemberGate } from "@/components/member-gate";
import { RequestForm } from "@/components/request-form";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("ask");

export default function Page() {
  return (
    <MemberGate>
      <RequestForm />
    </MemberGate>
  );
}

import type { Metadata } from "next";

import { MemberGate } from "@/components/member-gate";
import { ProfilePage } from "@/components/profile-page";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("profile");

export default function Page() {
  return (
    <MemberGate>
      <ProfilePage />
    </MemberGate>
  );
}

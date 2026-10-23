import type { Metadata } from "next";

import { MemberGate } from "@/features/members/member-gate";
import { ProfilePage } from "@/features/profile/profile";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("profile");

export default function Page() {
  return (
    <MemberGate>
      <ProfilePage />
    </MemberGate>
  );
}

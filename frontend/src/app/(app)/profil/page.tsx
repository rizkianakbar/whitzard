import type { Metadata } from "next";

import { MemberGate } from "@/components/member-gate";
import { ProfilePage } from "@/components/profile-page";

export const metadata: Metadata = { title: "Profil" };

export default function Page() {
  return (
    <MemberGate>
      <ProfilePage />
    </MemberGate>
  );
}

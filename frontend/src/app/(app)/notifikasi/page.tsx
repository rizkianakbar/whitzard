import type { Metadata } from "next";

import { MemberGate } from "@/components/member-gate";
import { NotificationList } from "@/components/notification-list";

export const metadata: Metadata = { title: "Notifikasi" };

export default function Page() {
  return (
    <MemberGate>
      <NotificationList />
    </MemberGate>
  );
}

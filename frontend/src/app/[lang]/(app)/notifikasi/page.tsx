import type { Metadata } from "next";

import { MemberGate } from "@/components/member-gate";
import { NotificationList } from "@/components/notification-list";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("notifications");

export default function Page() {
  return (
    <MemberGate>
      <NotificationList />
    </MemberGate>
  );
}

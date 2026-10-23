import type { Metadata } from "next";

import { MemberGate } from "@/features/members/member-gate";
import { NotificationList, NotificationListSkeleton } from "@/features/notifications/notifications";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("notifications");

export default function Page() {
  return (
    <MemberGate fallback={<NotificationListSkeleton />}>
      <NotificationList />
    </MemberGate>
  );
}

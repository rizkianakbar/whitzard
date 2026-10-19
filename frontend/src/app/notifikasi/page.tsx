import type { Metadata } from "next";

import { NotificationList } from "@/components/notification-list";

export const metadata: Metadata = { title: "Kabar" };

export default function Page() {
  return <NotificationList />;
}

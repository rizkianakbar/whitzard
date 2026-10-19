import type { Metadata } from "next";

import { RequestList } from "@/components/request-list";

export const metadata: Metadata = { title: "Permintaan" };

export default function Page() {
  return <RequestList />;
}

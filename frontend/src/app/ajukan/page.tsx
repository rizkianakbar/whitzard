import type { Metadata } from "next";

import { RequestForm } from "@/components/request-form";

export const metadata: Metadata = { title: "Ajukan bantuan" };

export default function Page() {
  return <RequestForm />;
}

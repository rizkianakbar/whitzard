import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = { title: "Beranda" };
export const instant = false

export default function Page() {
  return <Dashboard />;
}

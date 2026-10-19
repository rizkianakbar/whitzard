import type { Metadata } from "next";

import { Onboarding } from "@/components/onboarding";

export const metadata: Metadata = { title: "Gabung" };

export default function Page() {
  return <Onboarding />;
}

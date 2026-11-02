import type { Metadata } from "next";

import { Landing } from "@/features/landing/landing";

// The landing page is the only public, indexable page; both languages point at it.
export const metadata: Metadata = {
  alternates: { canonical: "/", languages: { en: "/en", id: "/id", "x-default": "/" } },
};

export default function Page() {
  return <Landing />;
}

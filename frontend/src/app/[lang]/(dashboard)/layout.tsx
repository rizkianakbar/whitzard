import type { Metadata } from "next";

import { AppShell } from "@/features/shell/shell";

// Member pages need a wallet sign-in, so keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: LayoutProps<"/[lang]">) {
  return <AppShell>{children}</AppShell>;
}

import { AppShell } from "@/features/shell/shell";

export default function Layout({ children }: LayoutProps<"/[lang]">) {
  return <AppShell>{children}</AppShell>;
}

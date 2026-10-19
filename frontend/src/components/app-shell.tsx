"use client";

import { type ReactNode, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useConnection, useSwitchChain } from "wagmi";

import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/brand";
import { SignInButton } from "@/components/sign-in-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shortAddress } from "@/lib/format";
import { useMe, useNotifications } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { chain } from "@/lib/wagmi";

const nav = [
  { href: "/", label: "Beranda", short: "Beranda" },
  { href: "/permintaan", label: "Permintaan", short: "Permintaan" },
  { href: "/ajukan", label: "Ajukan bantuan", short: "Ajukan" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Reads the URL, so it renders inside <Suspense> (Cache Components); the fallback has no active state. */
function NavLinks({ placement, pathname = "" }: { placement: "top" | "bottom"; pathname?: string }) {
  return nav.map((item) => {
    const active = pathname !== "" && isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={
          placement === "top"
            ? cn("border-b-2 border-transparent pt-[22px] pb-5 font-medium text-batu hover:text-nila", active && "border-nila text-nila")
            : cn("flex items-center justify-center text-[13px] font-semibold text-batu", active && "text-nila shadow-[inset_0_2px_0_var(--color-nila)]")
        }
      >
        {placement === "top" ? item.label : item.short}
      </Link>
    );
  });
}

function ActiveNavLinks({ placement }: { placement: "top" | "bottom" }) {
  return <NavLinks placement={placement} pathname={usePathname()} />;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col pb-16 md:pb-0">
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-[68px] max-w-[1120px] items-center gap-8 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Utama" className="hidden flex-1 gap-6 md:flex">
            <Suspense fallback={<NavLinks placement="top" />}>
              <ActiveNavLinks placement="top" />
            </Suspense>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <AccountMenu />
          </div>
        </div>
      </header>
      <WrongNetwork />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-10">{children}</main>
      <nav aria-label="Utama" className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-3 border-t bg-card md:hidden">
        <Suspense fallback={<NavLinks placement="bottom" />}>
          <ActiveNavLinks placement="bottom" />
        </Suspense>
      </nav>
    </div>
  );
}

function NotificationBell() {
  const { status } = useSession();
  const { data } = useNotifications(20);
  if (status !== "signed-in") return null;
  const unread = data?.filter((n) => !n.isRead).length ?? 0;
  return (
    <Link
      href="/notifikasi"
      aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
      className="relative flex size-11 items-center justify-center rounded-lg border bg-card hover:bg-accent"
    >
      <Bell aria-hidden="true" className="size-5" />
      {unread > 0 && (
        <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full border-2 border-card bg-kunyit" />
      )}
    </Link>
  );
}

function AccountMenu() {
  const { address, status, signOut } = useSession();
  const { data: me } = useMe();

  if (status === "loading") return null;
  if (status !== "signed-in" || !address) return <SignInButton />;
  const name = me?.profile?.displayName;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-11 items-center gap-2.5 rounded-lg border bg-card pr-3.5 pl-1.5 text-[13px] hover:bg-accent"
          />
        }
      >
        <Avatar name={name} className="size-8" />
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="font-semibold">{name ?? "Anggota"}</span>
          <span className="tabular text-batu">{shortAddress(address)}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {/* Base UI requires a label to sit inside a group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="tabular text-batu">{shortAddress(address)}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>Keluar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WrongNetwork() {
  const { address } = useSession();
  const { chainId } = useConnection();
  const { mutate: switchChain, isPending } = useSwitchChain();
  if (!address || chainId === undefined || chainId === chain.id) return null;
  return (
    <div className="border-b bg-kunyit-soft">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <p className="flex-1 text-kunyit-ink">Dompetmu terhubung ke jaringan lain. Whitzard berjalan di {chain.name}.</p>
        <Button size="default" variant="outline" disabled={isPending} onClick={() => switchChain({ chainId: chain.id })}>
          Pindah ke {chain.name}
        </Button>
      </div>
    </div>
  );
}

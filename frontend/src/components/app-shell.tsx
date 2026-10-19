"use client";

import { type ReactNode, Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Plus, UserRound } from "lucide-react";
import { useConnection, useSwitchChain } from "wagmi";

import { Avatar, callName } from "@/components/avatar";
import { Logo, TestnetPill } from "@/components/brand";
import { TopUpDialog } from "@/components/top-up";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatWhzd, shortAddress } from "@/lib/format";
import { useMe, useNotifications } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { chain } from "@/lib/wagmi";

const nav = [
  { href: "/beranda", label: "Beranda" },
  { href: "/permintaan", label: "Permintaan" },
  { href: "/ajukan", label: "Ajukan" },
] as const;

/** Reads the URL, so it renders inside <Suspense> (Cache Components); the fallback has no active state. */
function NavLinks({ placement, pathname = "" }: { placement: "top" | "bottom"; pathname?: string }) {
  return nav.map((item) => {
    const active = pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={
          placement === "top"
            ? cn("rounded-full px-4 py-2 font-semibold text-batu hover:bg-muted hover:text-arang", active && "bg-pandan-soft text-pandan hover:bg-pandan-soft hover:text-pandan")
            : cn("flex items-center justify-center text-[13px] font-semibold text-batu", active && "text-pandan shadow-[inset_0_3px_0_var(--color-pandan)]")
        }
      >
        {item.label}
      </Link>
    );
  });
}

function ActiveNavLinks({ placement }: { placement: "top" | "bottom" }) {
  return <NavLinks placement={placement} pathname={usePathname()} />;
}

/** The members-only area: sends signed-out visitors to the landing page and non-members to /gabung. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col pb-16 md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-17 max-w-290 items-center gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo href="/beranda" />
            <TestnetPill className="hidden sm:inline-flex" />
          </div>
          <MemberOnly>
            <nav aria-label="Utama" className="hidden flex-1 gap-1 md:flex">
              <Suspense fallback={<NavLinks placement="top" />}>
                <ActiveNavLinks placement="top" />
              </Suspense>
            </nav>
          </MemberOnly>
          <div className="ml-auto flex items-center gap-2">
            <Wallet />
            <NotificationBell />
            <AccountMenu />
          </div>
        </div>
      </header>
      <WrongNetwork />
      <main className="mx-auto w-full max-w-290 flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
        <Suspense fallback={<PageSkeleton />}>
          <Gate>{children}</Gate>
        </Suspense>
      </main>
      <MemberOnly>
        <nav aria-label="Utama" className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-3 border-t bg-card md:hidden">
          <Suspense fallback={<NavLinks placement="bottom" />}>
            <ActiveNavLinks placement="bottom" />
          </Suspense>
        </nav>
      </MemberOnly>
    </div>
  );
}

/** Navigation only makes sense once registered; while joining, /gabung is the only page. */
function MemberOnly({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  return me?.chain.registered ? children : null;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-64 rounded-full" />
      <Skeleton className="h-48 w-full rounded-3xl" />
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const { data: me } = useMe();
  const joining = pathname === "/gabung";
  const registered = me?.chain.registered;

  useEffect(() => {
    if (status === "disconnected" || status === "signed-out") router.replace("/");
    else if (registered === false && !joining) router.replace("/gabung");
  }, [status, registered, joining, router]);

  if (status !== "signed-in" || !me || (!registered && !joining)) return <PageSkeleton />;
  return children;
}

function Wallet() {
  const { status } = useSession();
  const { data: me } = useMe();
  if (status !== "signed-in" || !me?.chain.registered) return null;
  return (
    <TopUpDialog
      me={me}
      trigger={
        <button
          type="button"
          aria-label={`Saldo ${formatWhzd(me.chain.balance)} WHZD. Isi saldo`}
          className="flex h-11 items-center gap-2 rounded-full border bg-card pr-1.5 pl-4 hover:bg-muted"
        >
          <span className="tabular text-sm font-bold whitespace-nowrap">
            {formatWhzd(me.chain.balance)}
            <span className="hidden sm:inline"> WHZD</span>
          </span>
          <span className="flex size-8 items-center justify-center rounded-full bg-pandan text-white">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
          </span>
        </button>
      }
    />
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
      className="relative flex size-11 items-center justify-center rounded-full border bg-card hover:bg-muted"
    >
      <Bell aria-hidden="true" className="size-5" />
      {unread > 0 && (
        <span className="tabular absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-kunyit px-1 text-[11px] font-bold text-arang">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function AccountMenu() {
  const router = useRouter();
  const { address, status, signOut } = useSession();
  const { data: me } = useMe();
  if (status !== "signed-in" || !address) return null;
  const profile = me?.profile;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" aria-label="Akun" className="flex rounded-full hover:opacity-90" />}
      >
        <Avatar address={address} profile={profile} className="size-11 text-sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60 rounded-2xl p-1.5">
        {/* Base UI requires a label to sit inside a group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
            <span className="text-base font-bold text-arang">{callName(profile, "Anggota")}</span>
            <span className="tabular text-xs font-normal text-batu">{shortAddress(address)}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2.5 rounded-xl px-2.5 py-2 text-base" onClick={() => router.push("/profil")}>
          <UserRound aria-hidden="true" className="size-4" />
          Profil
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2.5 rounded-xl px-2.5 py-2 text-base" onClick={() => void signOut()}>
          <LogOut aria-hidden="true" className="size-4" />
          Keluar
        </DropdownMenuItem>
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
      <div className="mx-auto flex max-w-290 flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <p className="flex-1 text-kunyit-ink">Dompetmu terhubung ke jaringan lain. Whitzard berjalan di {chain.name}.</p>
        <Button variant="outline" disabled={isPending} onClick={() => switchChain({ chainId: chain.id })}>
          Pindah ke {chain.name}
        </Button>
      </div>
    </div>
  );
}

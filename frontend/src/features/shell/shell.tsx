"use client";

import { type ReactNode, Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Languages, LogOut, Plus, UserRound } from "lucide-react";
import { useConnection, useSwitchChain } from "wagmi";

import { Logo, TestnetPill } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/features/members/member-avatar";
import { useMe } from "@/features/members/members.hooks";
import { callName } from "@/features/members/members.lib";
import { NotificationItem } from "@/features/notifications/notifications";
import { useMarkRead, useNotifications } from "@/features/notifications/notifications.hooks";
import { useSession } from "@/features/session/session.hooks";
import { TopUpDialog } from "@/features/top-up/top-up";
import { chain } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { type Locale, switchLocale, useI18n } from "@/lib/i18n";
import { locales } from "@/lib/i18n/config";
import { useNow } from "@/lib/now";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/home", label: "home" },
  { href: "/requests", label: "requests" },
  { href: "/ask", label: "ask" },
] as const;

type NavLinksProps = {
  placement: "top" | "bottom";
  pathname?: string;
};

/** Reads the URL, so it renders inside <Suspense> (Cache Components); the fallback has no active state. */
function NavLinks(props: NavLinksProps) {
  const { placement, pathname = "" } = props;
  const { t } = useI18n();
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
        {t.shell.nav[item.label]}
      </Link>
    );
  });
}

type ActiveNavLinksProps = {
  placement: "top" | "bottom";
};

function ActiveNavLinks(props: ActiveNavLinksProps) {
  const { placement } = props;
  return <NavLinks placement={placement} pathname={usePathname()} />;
}

type AppShellProps = {
  children: ReactNode;
};

/** The members-only area's frame. Each page guards its own content with <MemberGate>. */
export function AppShell(props: AppShellProps) {
  const { children } = props;
  const { t } = useI18n();
  return (
    <div className="flex min-h-full flex-col pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-17 max-w-290 items-center gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo href="/home" />
            <TestnetPill className="hidden sm:inline-flex" />
          </div>
          <MemberOnly>
            <nav aria-label={t.shell.navLabel} className="hidden flex-1 gap-1 md:flex">
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
        {children}
      </main>
      <MemberOnly>
        <nav
          aria-label={t.shell.navLabel}
          className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(4rem+env(safe-area-inset-bottom,0px))] grid-cols-3 border-t bg-card pb-[env(safe-area-inset-bottom,0px)] md:hidden"
        >
          <Suspense fallback={<NavLinks placement="bottom" />}>
            <ActiveNavLinks placement="bottom" />
          </Suspense>
        </nav>
      </MemberOnly>
    </div>
  );
}

type MemberOnlyProps = {
  children: ReactNode;
};

/** Navigation only makes sense once registered; while joining, /join is the only page. */
function MemberOnly(props: MemberOnlyProps) {
  const { children } = props;
  const { data: me } = useMe();
  return me?.chain.registered ? children : null;
}

function Wallet() {
  const { status } = useSession();
  const { data: me } = useMe();
  const { t, fmt } = useI18n();
  if (status !== "signed-in" || !me?.chain.registered) return null;
  return (
    <TopUpDialog
      me={me}
      trigger={
        <button
          type="button"
          aria-label={t.shell.balance(fmt.whzd(me.chain.balance))}
          className="pressable flex h-11 items-center gap-2 rounded-full border bg-card pr-1.5 pl-4 hover:bg-muted"
        >
          <span className="tabular text-sm font-bold whitespace-nowrap">
            {fmt.whzd(me.chain.balance)}
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

const BELL_PREVIEW = 6;

/** The bell opens the latest notifications in place; the full list is one link away. */
function NotificationBell() {
  const { status } = useSession();
  const { data, isPending } = useNotifications(20);
  const markRead = useMarkRead();
  const now = useNow();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (status !== "signed-in") return null;
  const unreadItems = data?.filter((n) => !n.isRead) ?? [];
  const unread = unreadItems.length;
  const latest = data?.slice(0, BELL_PREVIEW) ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={unread ? t.shell.unread(unread) : t.shell.notifications}
        // No press scale (`pressable`) here: the popup is positioned from the bell's box while it is
        // still scaled down from the click, then jumps right as the bell springs back.
        className={cn(
          "relative flex size-11 items-center justify-center rounded-full border bg-card transition-colors hover:bg-muted active:bg-garis",
          open && "bg-muted",
        )}
      >
        <Bell aria-hidden="true" className="size-5" />
        {unread > 0 && (
          <span className="tabular pop-in absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-kunyit px-1 text-[11px] font-bold text-arang">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={12} className="flex w-[min(380px,calc(100vw-32px))] flex-col rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <PopoverTitle className="text-base font-bold">{t.shell.notifications}</PopoverTitle>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markRead.mutate(unreadItems)}
              className="pressable text-[13px] font-semibold text-pandan hover:underline"
            >
              {t.shell.markAllRead}
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isPending ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : latest.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm leading-relaxed text-batu">
              {t.shell.bellEmpty}
            </p>
          ) : (
            <ul>
              {latest.map((n, i) => (
                <li key={n.id} className={cn(i > 0 && "border-t")}>
                  <NotificationItem notification={n} now={now} compact onOpen={() => setOpen(false)} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="border-t px-4 py-3 text-center text-sm font-semibold text-pandan hover:bg-muted"
        >
          {t.shell.seeAll}
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function AccountMenu() {
  const router = useRouter();
  const { address, status, signOut } = useSession();
  const { data: me } = useMe();
  const { locale, t } = useI18n();
  if (status !== "signed-in" || !address) return null;
  const profile = me?.profile;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" aria-label={t.shell.account} className="pressable flex rounded-full hover:opacity-90" />}
      >
        <Avatar address={address} profile={profile} className="size-11 text-sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60 rounded-2xl p-1.5 mt-2">
        {/* Base UI requires a label to sit inside a group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
            <span className="text-base font-bold text-arang">{callName(profile, t.common.member)}</span>
            <span className="tabular text-xs font-normal text-batu">{shortAddress(address)}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2.5 rounded-xl px-2.5 py-2 text-base" onClick={() => router.push("/profile")}>
          <UserRound aria-hidden="true" className="size-4" />
          {t.shell.profile}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 pt-2 pb-1 text-[13px] font-semibold text-batu">
            <Languages aria-hidden="true" className="size-4" />
            {t.language.label}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={locale} onValueChange={(value: Locale) => value !== locale && switchLocale(value)}>
            {locales.map((l) => (
              <DropdownMenuRadioItem key={l} value={l} lang={l} className="rounded-xl px-2.5 py-2 text-base">
                {t.language.names[l]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2.5 rounded-xl px-2.5 py-2 text-base" onClick={() => void signOut()}>
          <LogOut aria-hidden="true" className="size-4" />
          {t.shell.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WrongNetwork() {
  const { address } = useSession();
  const { chainId } = useConnection();
  const { mutate: switchChain, isPending } = useSwitchChain();
  const { t } = useI18n();
  if (!address || chainId === undefined || chainId === chain.id) return null;
  return (
    <div className="border-b bg-kunyit-soft">
      <div className="mx-auto flex max-w-290 flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <p className="flex-1 text-kunyit-ink">{t.shell.wrongNetwork(chain.name)}</p>
        <Button variant="outline" disabled={isPending} onClick={() => switchChain({ chainId: chain.id })}>
          {t.shell.switchTo(chain.name)}
        </Button>
      </div>
    </div>
  );
}

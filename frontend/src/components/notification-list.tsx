"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Notification } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { type I18n, useI18n } from "@/lib/i18n";
import { keys, useNotifications } from "@/lib/queries";
import { useNow } from "@/lib/now";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * A notification's title and text in the member's language, built from its type, request and amount.
 * Falls back to the backend's Indonesian text when those aren't enough (rows from before amounts
 * were kept, or a type this client doesn't know yet).
 */
export function notificationText(n: Notification, { t, fmt }: I18n): { title: string; description: string } {
  const types = t.notifications.types;
  const id = n.requestId;
  if (id === null) return n;
  switch (n.type) {
    case "request_cancelled":
    case "request_expired":
      return { title: types[n.type].title, description: types[n.type].body(id) };
    default:
      if (n.amount === null || !(n.type in types)) return n;
      return { title: types[n.type].title, description: types[n.type].body(id, fmt.whzd(n.amount)) };
  }
}

/** Marks notifications read and refreshes every list of them (the bell's and this page's). */
export function useMarkRead() {
  const { token } = useSession();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  return async (items: Notification[]) => {
    try {
      await Promise.all(items.map((n) => api.markRead(token!, n.id)));
      await queryClient.invalidateQueries({ queryKey: keys.notifications });
    } catch (error) {
      toast.error(errorMessage(error, t));
    }
  };
}

/**
 * One notification: unread dot, title (a link to its request, which also marks it read), text and
 * age. `compact` for the bell's popup.
 */
export function NotificationItem({
  notification: n,
  now,
  compact,
  onOpen,
}: {
  notification: Notification;
  now: number;
  compact?: boolean;
  /** Called after the title link is followed, e.g. to close the popup. */
  onOpen?: () => void;
}) {
  const markRead = useMarkRead();
  const i18n = useI18n();
  const { title, description } = notificationText(n, i18n);
  return (
    <div className={cn("flex", compact ? "gap-3 px-4 py-3" : "gap-4 p-5", !n.isRead && compact && "bg-kunyit-soft/40")}>
      <span
        aria-label={n.isRead ? undefined : i18n.t.notifications.unread}
        className={cn("mt-2 size-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-kunyit")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {n.requestId ? (
          <Link
            href={`/permintaan/${n.requestId}`}
            onClick={() => {
              if (!n.isRead) void markRead([n]);
              onOpen?.();
            }}
            className={cn("font-semibold hover:underline", compact && "text-[15px] leading-snug")}
          >
            {title}
          </Link>
        ) : (
          <span className={cn("font-semibold", compact && "text-[15px] leading-snug")}>{title}</span>
        )}
        <span className={cn("text-batu", compact ? "line-clamp-2 text-sm leading-snug" : "leading-relaxed")}>{description}</span>
        <span className={cn("text-batu", compact ? "text-xs" : "text-[13px]")}>{i18n.fmt.timeAgo(n.createdAt, now)}</span>
      </div>
    </div>
  );
}

export function NotificationList() {
  const { t } = useI18n();
  const markRead = useMarkRead();
  const { data, isPending } = useNotifications(100);
  const now = useNow();
  const unread = data?.filter((n) => !n.isRead) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[39px] leading-tight font-extrabold text-pandan">{t.notifications.title}</h1>
        {unread.length > 0 && (
          <Button variant="outline" onClick={() => void markRead(unread)}>
            {t.notifications.markAllRead}
          </Button>
        )}
      </div>
      {isPending ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : !data?.length ? (
        <p className="rounded-3xl border border-dashed bg-card p-8 leading-relaxed text-batu">
          {t.notifications.empty}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-3xl border bg-card">
          {data.map((n, i) => (
            <li key={n.id} className={cn(i > 0 && "border-t")}>
              <NotificationItem notification={n} now={now} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

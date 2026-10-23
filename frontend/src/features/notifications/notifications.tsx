"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SkeletonText } from "@/components/ui/skeleton";
import { useMarkRead, useNotifications } from "@/features/notifications/notifications.hooks";
import { notificationText } from "@/features/notifications/notifications.lib";
import type { Notification } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import { cn } from "@/lib/utils";

type NotificationItemProps = {
  notification: Notification;
  now: number;
  compact?: boolean;
  /** Called after the title link is followed, e.g. to close the popup. */
  onOpen?: () => void;
};

/**
 * One notification: unread dot, title (a link to its request, which also marks it read), text and
 * age. `compact` for the bell's popup.
 */
export function NotificationItem(props: NotificationItemProps) {
  const { notification: n, now, compact, onOpen } = props;
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
            href={`/requests/${n.requestId}`}
            onClick={() => {
              if (!n.isRead) markRead.mutate([n]);
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

type NotificationsSkeletonProps = {
  count: number;
  compact?: boolean;
};

/** NotificationItem rows while the list loads, at the same padding and line heights. */
export function NotificationsSkeleton(props: NotificationsSkeletonProps) {
  const { count, compact } = props;
  return (
    <ul aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={cn(i > 0 && "border-t")}>
          <div className={cn("flex", compact ? "gap-3 px-4 py-3" : "gap-4 p-5")}>
            <span className="mt-2 size-2 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <SkeletonText className={cn("w-1/2 font-semibold", compact && "text-[15px] leading-snug")} />
              <SkeletonText className={cn("w-11/12", compact ? "text-sm leading-snug" : "leading-relaxed")} />
              <SkeletonText className={cn("w-16", compact ? "text-xs" : "text-[13px]")} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The notifications page before anything has loaded. */
export function NotificationListSkeleton() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-[39px] leading-tight font-extrabold text-pandan">{t.notifications.title}</h1>
      <div className="overflow-hidden rounded-3xl border bg-card">
        <NotificationsSkeleton count={4} />
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
          <Button variant="outline" disabled={markRead.isPending} onClick={() => markRead.mutate(unread)}>
            {t.notifications.markAllRead}
          </Button>
        )}
      </div>
      {isPending ? (
        <div className="overflow-hidden rounded-3xl border bg-card">
          <NotificationsSkeleton count={4} />
        </div>
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

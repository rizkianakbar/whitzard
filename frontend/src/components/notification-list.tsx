"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Notification } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { keys, useNotifications } from "@/lib/queries";
import { useNow } from "@/lib/now";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/** Marks notifications read and refreshes every list of them (the bell's and this page's). */
export function useMarkRead() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  return async (items: Notification[]) => {
    try {
      await Promise.all(items.map((n) => api.markRead(token!, n.id)));
      await queryClient.invalidateQueries({ queryKey: keys.notifications });
    } catch (error) {
      toast.error(errorMessage(error));
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
  return (
    <div className={cn("flex", compact ? "gap-3 px-4 py-3" : "gap-4 p-5", !n.isRead && compact && "bg-kunyit-soft/40")}>
      <span
        aria-label={n.isRead ? undefined : "Belum dibaca"}
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
            {n.title}
          </Link>
        ) : (
          <span className={cn("font-semibold", compact && "text-[15px] leading-snug")}>{n.title}</span>
        )}
        <span className={cn("text-batu", compact ? "line-clamp-2 text-sm leading-snug" : "leading-relaxed")}>{n.description}</span>
        <span className={cn("text-batu", compact ? "text-xs" : "text-[13px]")}>{timeAgo(n.createdAt, now)}</span>
      </div>
    </div>
  );
}

export function NotificationList() {
  const markRead = useMarkRead();
  const { data, isPending } = useNotifications(100);
  const now = useNow();
  const unread = data?.filter((n) => !n.isRead) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[39px] leading-tight font-extrabold text-pandan">Notifikasi</h1>
        {unread.length > 0 && (
          <Button variant="outline" onClick={() => void markRead(unread)}>
            Tandai semua sudah dibaca
          </Button>
        )}
      </div>
      {isPending ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : !data?.length ? (
        <p className="rounded-3xl border border-dashed bg-card p-8 leading-relaxed text-batu">
          Belum ada notifikasi. Kamu akan diberi tahu saat ada anggota yang butuh bantuan, saat iuran masuk, dan saat dana
          diteruskan.
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

"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SignedIn } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Notification } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { keys, useNotifications } from "@/lib/queries";
import { useNow } from "@/lib/now";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export function NotificationList() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <SignedIn reason="Hubungkan dompet untuk melihat kabar tentang permintaan dan iuranmu.">
        <List />
      </SignedIn>
    </div>
  );
}

function List() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const { data, isPending } = useNotifications(100);
  const now = useNow();
  const unread = data?.filter((n) => !n.isRead) ?? [];

  const markRead = async (items: Notification[]) => {
    try {
      await Promise.all(items.map((n) => api.markRead(token!, n.id)));
      await queryClient.invalidateQueries({ queryKey: keys.notifications });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[31px] font-semibold tracking-tight">Kabar</h1>
        {unread.length > 0 && (
          <Button variant="outline" onClick={() => void markRead(unread)}>
            Tandai semua sudah dibaca
          </Button>
        )}
      </div>
      {isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !data?.length ? (
        <p className="rounded-xl border border-dashed bg-card p-8 leading-relaxed text-batu">
          Belum ada kabar. Kamu akan diberi tahu saat ada anggota yang butuh bantuan, saat iuran masuk, dan saat dana
          diteruskan.
        </p>
      ) : (
        <ul className="rounded-xl border bg-card">
          {data.map((n, i) => (
            <li key={n.id} className={cn("flex gap-4 p-5", i > 0 && "border-t")}>
              <span
                aria-label={n.isRead ? undefined : "Belum dibaca"}
                className={cn("mt-2 size-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-kunyit")}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {n.requestId ? (
                  <Link
                    href={`/permintaan/${n.requestId}`}
                    onClick={() => !n.isRead && void markRead([n])}
                    className="font-semibold hover:underline"
                  >
                    {n.title}
                  </Link>
                ) : (
                  <span className="font-semibold">{n.title}</span>
                )}
                <span className="leading-relaxed text-batu">{n.description}</span>
                <span className="text-[13px] text-batu">{timeAgo(n.createdAt, now)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

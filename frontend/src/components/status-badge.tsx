import type { Request } from "@/lib/api";
import { cn } from "@/lib/utils";

const styles = {
  open: ["Terbuka", "bg-pandan-soft text-pandan"],
  funding: ["Mengumpulkan", "bg-kunyit-soft text-kunyit-ink"],
  awaiting: ["Sedang dikirim", "bg-kunyit-soft text-kunyit-ink"],
  finalized: ["Terkirim", "bg-daun-soft text-daun-ink"],
  expired: ["Berakhir", "bg-muted text-batu"],
  cancelled: ["Dibatalkan", "bg-bata-soft text-bata-ink"],
} as const;

export function StatusBadge({ request, className }: { request: Pick<Request, "status" | "awaitingFinalize">; className?: string }) {
  const [label, style] = styles[request.awaitingFinalize ? "awaiting" : request.status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold", style, className)}>
      {label}
    </span>
  );
}

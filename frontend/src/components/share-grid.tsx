import type { SnapshotResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  size: number;
  contributed: number;
  declined: number;
  /** The viewer's own response if they are in the snapshot: their cell is outlined. */
  you?: SnapshotResponse | null;
  /** Animate the viewer's cell filling in (once, right after their contribution). */
  justContributed?: boolean;
  variant?: "large" | "medium" | "small";
  className?: string;
};

type Cell = { kind: "filled" | "declined" | "empty"; you: boolean };

/** Order: other contributors, then the viewer, then declined, then no answer yet. */
export function shareCells(size: number, contributed: number, declined: number, you?: SnapshotResponse | null): Cell[] {
  const yourKind: Cell["kind"] | null = you === "contributed" ? "filled" : you === "declined" ? "declined" : you ? "empty" : null;
  const count = (n: number, kind: Cell["kind"]) => Math.max(0, n - (yourKind === kind ? 1 : 0));
  const filled = count(contributed, "filled");
  const declinedOthers = count(declined, "declined");
  const empty = Math.max(0, size - filled - declinedOthers - (yourKind ? 1 : 0));
  return [
    ...Array.from({ length: filled }, () => ({ kind: "filled" as const, you: false })),
    ...(yourKind ? [{ kind: yourKind, you: true } satisfies Cell] : []),
    ...Array.from({ length: declinedOthers }, () => ({ kind: "declined" as const, you: false })),
    ...Array.from({ length: empty }, () => ({ kind: "empty" as const, you: false })),
  ];
}

/**
 * Kisi iuran: one cell per member in the request's snapshot, all worth the same share.
 * Filled = contributed, hatched = declined, empty = no answer yet; the viewer's cell is outlined.
 */
export function ShareGrid({ size, contributed, declined, you, justContributed, variant = "large", className }: Props) {
  const cells = shareCells(size, contributed, declined, you);
  const large = variant === "large";
  const medium = variant === "medium";
  const label =
    `${contributed} dari ${size} anggota sudah membantu` +
    (declined ? `, ${declined} tidak ikut` : "") +
    (you ? ", kotakmu bergaris tebal" : "");

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "grid",
        large
          ? "grid-cols-[repeat(auto-fill,minmax(32px,44px))] gap-2"
          : medium
            ? "grid-cols-[repeat(auto-fill,22px)] gap-1.5"
            : "grid-cols-[repeat(auto-fill,12px)] gap-[3px]",
        className,
      )}
    >
      {cells.map((cell, i) => (
        <span
          key={i}
          className={cn(
            "box-border aspect-square",
            large ? "rounded-[10px]" : medium ? "rounded-[6px]" : "rounded-[3px]",
            cell.kind === "filled" && "bg-kunyit",
            cell.kind === "declined" &&
              "border border-garis bg-[repeating-linear-gradient(135deg,#fff_0_6px,#d9dee7_6px_7px)]",
            cell.kind === "empty" && "border border-garis bg-card",
            cell.you && (large ? "border-[3px] border-pandan" : "border-2 border-pandan"),
            cell.you && cell.kind === "filled" && justContributed && "share-fill",
          )}
        />
      ))}
    </div>
  );
}

export function ShareLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-batu">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3.5 rounded-[3px] bg-kunyit" />
        Sudah membantu
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3.5 rounded-[3px] border-2 border-pandan" />
        Kamu
      </li>
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-3.5 rounded-[3px] border border-garis bg-[repeating-linear-gradient(135deg,#fff_0_3px,#d9dee7_3px_4px)]"
        />
        Tidak ikut
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3.5 rounded-[3px] border border-garis bg-card" />
        Belum menjawab
      </li>
    </ul>
  );
}

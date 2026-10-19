import Link from "next/link";

import { cn } from "@/lib/utils";

/** The mark echoes the share grid: four equal shares, one being filled. */
export function Logo({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md">
      <span aria-hidden="true" className="grid size-6 grid-cols-2 gap-0.75">
        <span className={cn("rounded-[4px]", inverted ? "bg-white" : "bg-pandan")} />
        <span className={cn("rounded-[4px]", inverted ? "bg-white" : "bg-pandan")} />
        <span className={cn("rounded-[4px]", inverted ? "bg-white" : "bg-pandan")} />
        <span className="rounded-[4px] bg-kunyit" />
      </span>
      <span className={cn("text-xl font-extrabold tracking-tight", inverted ? "text-white" : "text-pandan")}>Whitzard</span>
    </Link>
  );
}

/** Always visible while Whitzard runs on a test network. */
export function TestnetPill({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-kunyit-soft px-2.5 py-1 text-xs font-bold text-kunyit-ink", className)}>
      Uji coba
    </span>
  );
}

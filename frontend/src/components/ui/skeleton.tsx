import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/**
 * A line of text that hasn't loaded. Give it the real text's type classes (text-xl, leading-snug, …):
 * it takes that line's exact height, so the real text replaces it without the layout moving.
 * On a dark surface, set `--skeleton` on an ancestor to recolour the bar.
 */
function SkeletonText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span data-slot="skeleton" aria-hidden="true" className={cn("block max-w-full", className)} {...props}>
      <span className="inline-block h-[0.8em] w-full animate-pulse rounded-full bg-(--skeleton,var(--color-muted)) align-middle" />
    </span>
  )
}

export { Skeleton, SkeletonText }

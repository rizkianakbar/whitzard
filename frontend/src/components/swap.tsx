"use client";

import { useChanged } from "@/lib/use-changed";

type SwapProps = {
  children: string;
};

/** Text that replaces other text in place (a button moving through transaction phases): each new
 * value fades in from a slight blur instead of snapping. The first value just renders. */
export function Swap(props: SwapProps) {
  const { children } = props;
  const changed = useChanged(children);
  return (
    <span key={children} className={changed ? "swap-in" : undefined}>
      {children}
    </span>
  );
}

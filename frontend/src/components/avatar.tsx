import { User } from "lucide-react";

import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A member's initials, or a person icon when they have not set a name. */
export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  const text = initials(name);
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full bg-nila-soft font-bold", className)}>
      {text ?? <User className="size-[55%]" strokeWidth={2.2} />}
    </span>
  );
}

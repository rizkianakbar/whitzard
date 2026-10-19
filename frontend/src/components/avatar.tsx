"use client";

import { User } from "lucide-react";
import type { Address } from "viem";

import type { MemberProfile } from "@/lib/api";
import { initials } from "@/lib/format";
import { usePhotoUrl } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** A member's photo, else their initials, else a person icon. */
export function Avatar({
  address,
  profile,
  className,
}: {
  address?: Address;
  profile?: Pick<MemberProfile, "displayName" | "nickname" | "photo"> | null;
  className?: string;
}) {
  const url = usePhotoUrl(address, profile?.photo);
  const text = initials(profile?.displayName ?? profile?.nickname);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-pandan-soft font-bold text-pandan",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        (text ?? <User className="size-[55%]" strokeWidth={2.2} />)
      )}
    </span>
  );
}

/** What to call a member: nickname, else full name, else the short address. */
export function callName(profile: Pick<MemberProfile, "displayName" | "nickname"> | null | undefined, fallback: string) {
  return profile?.nickname ?? profile?.displayName ?? fallback;
}

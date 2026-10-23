"use client";

import { User } from "lucide-react";
import type { Address } from "viem";

import { usePhotoUrl } from "@/features/members/members.hooks";
import type { MemberProfile } from "@/lib/api";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

type AvatarProps = {
  address?: Address;
  profile?: Pick<MemberProfile, "displayName" | "nickname" | "photo"> | null;
  className?: string;
};

/** A member's photo, else their initials, else a person icon. */
export function Avatar(props: AvatarProps) {
  const { address, profile, className } = props;
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

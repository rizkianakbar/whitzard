import type { Member, MemberProfile } from "@/lib/api";

/** What to call a member: nickname, else full name, else `fallback` (usually the short address). */
export function callName(profile: Pick<MemberProfile, "displayName" | "nickname"> | null | undefined, fallback: string) {
  return profile?.nickname ?? profile?.displayName ?? fallback;
}

/** Name and email filled in: what onboarding asks for before anything else. */
export const hasProfile = (me: Member) => !!me.profile?.displayName && !!me.profile?.email;

/** Has claimed from the faucet or holds WHZD. */
export const hasTokens = (me: Member) => BigInt(me.chain.faucetClaimed) > 0n || BigInt(me.chain.balance) > 0n;

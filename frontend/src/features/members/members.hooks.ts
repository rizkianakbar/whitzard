"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";

import { useSession } from "@/features/session/session.hooks";
import { api, type MemberProfile } from "@/lib/api";
import { keys, viewer } from "@/lib/query-keys";

/** The signed-in member: profile plus on-chain state (registration, Ready, balance, faucet). */
export function useMe() {
  const { address, token } = useSession();
  return useQuery({
    queryKey: keys.member(address ?? "none"),
    queryFn: () => api.member(address!, token),
    enabled: !!address,
  });
}

function useMembersQuery<T>(select: (members: MemberProfile[]) => T) {
  const { address, token } = useSession();
  return useQuery({
    queryKey: [...keys.members, viewer(address, token)],
    queryFn: async () => (await api.members(token!)).members,
    enabled: !!token,
    select,
  });
}

const all = (members: MemberProfile[]) => members;
const byAddress = (members: MemberProfile[]) => new Map(members.map((m) => [m.address.toLowerCase(), m]));

/** Every registered member's profile, ready ones first. */
export function useMembers() {
  return useMembersQuery(all);
}

/**
 * A member's profile, looked up in the member list: every name and avatar on a page comes from
 * that one cached request instead of a /members/:address call (and its chain reads) per person.
 */
export function useProfile(address: string | undefined): MemberProfile | undefined {
  const { data } = useMembersQuery(byAddress);
  return address ? data?.get(address.toLowerCase()) : undefined;
}

export function useMemberStats() {
  const { address, token } = useSession();
  return useQuery({
    queryKey: keys.memberStats(address ?? "none"),
    queryFn: () => api.memberStats(token!),
    enabled: !!token && !!address,
  });
}

export function useRefunds() {
  const { address, token } = useSession();
  return useQuery({ queryKey: [...keys.refunds, viewer(address, token)], queryFn: () => api.refunds(token!), enabled: !!token });
}

export function useProof() {
  const { address, token } = useSession();
  return useQuery({ queryKey: [...keys.proof, viewer(address, token)], queryFn: () => api.proof(token!), enabled: !!token });
}

/**
 * An object URL for a member's photo (photos need a session, so <img src> can't fetch them
 * directly). Keyed by the photo's hash, so each version is fetched once per page load.
 */
export function usePhotoUrl(address: Address | undefined, photo: string | null | undefined) {
  const { token } = useSession();
  const { data: url } = useQuery({
    queryKey: keys.photo(address ?? "none", photo ?? "none"),
    queryFn: async () => URL.createObjectURL(await api.photo(token!, address!, photo!)),
    enabled: !!token && !!address && !!photo,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return photo ? (url ?? null) : null;
}

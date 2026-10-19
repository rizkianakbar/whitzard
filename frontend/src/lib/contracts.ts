import { escrowAbi } from "@/lib/abi/escrow";
import { registryAbi } from "@/lib/abi/registry";
import { tokenAbi } from "@/lib/abi/token";
import { appConfig } from "@/lib/config";

const errorsOf = <T extends readonly { type: string }[]>(abi: T) =>
  abi.filter((item): item is Extract<T[number], { type: "error" }> => item.type === "error");

// Escrow calls can revert inside the Registry (e.g. NotEligible) or the token (balance,
// allowance); including their errors lets viem decode those reverts by name.
export const escrow = {
  address: appConfig.escrow,
  abi: [...escrowAbi, ...errorsOf(registryAbi), ...errorsOf(tokenAbi)],
} as const;
export const registry = { address: appConfig.registry, abi: registryAbi } as const;
export const token = { address: appConfig.token, abi: tokenAbi } as const;

import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";
import { ProviderNotFoundError } from "wagmi";

import { ApiError } from "@/lib/api";
import type { Dict } from "@/lib/i18n";

/**
 * A short, actionable message for any error from the wallet, the chain or the API, in the member's
 * language. Contract custom errors (contracts/interfaces) map to what the member should know or do.
 */
export function errorMessage(error: unknown, t: Dict): string {
  if (error instanceof ApiError) return error.message || t.errors.request(error.status);
  if (error instanceof ProviderNotFoundError) return t.errors.noWallet;
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return t.errors.rejected;
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && t.errors.contract[name]) return t.errors.contract[name];
    }
    if (/insufficient funds/i.test(error.message)) return t.errors.insufficientFunds;
    return error.shortMessage;
  }
  if (error instanceof Error) return error.message;
  return t.errors.generic;
}

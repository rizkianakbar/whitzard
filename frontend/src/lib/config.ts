import { type Address, getAddress, isAddress } from "viem";
import { hardhat, sepolia } from "viem/chains";

// NEXT_PUBLIC_* values are inlined at build time, so each must be referenced literally.
function address(name: string, value: string | undefined): Address {
  if (!value || !isAddress(value)) {
    throw new Error(`${name} must be set to a contract address (see .env.example)`);
  }
  return getAddress(value);
}

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);

/** The one chain the app runs on: Sepolia, or a local Hardhat node in development. */
export const chain = chainId === hardhat.id ? hardhat : sepolia;

export const appConfig = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080").replace(/\/$/, ""),
  chainId,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || undefined,
  token: address("NEXT_PUBLIC_TOKEN_ADDRESS", process.env.NEXT_PUBLIC_TOKEN_ADDRESS),
  registry: address("NEXT_PUBLIC_REGISTRY_ADDRESS", process.env.NEXT_PUBLIC_REGISTRY_ADDRESS),
  escrow: address("NEXT_PUBLIC_ESCROW_ADDRESS", process.env.NEXT_PUBLIC_ESCROW_ADDRESS),
  // Local development only: lists the Hardhat node's test accounts as wallets.
  devAccounts: process.env.NEXT_PUBLIC_DEV_ACCOUNTS === "true" && chainId === 31337,
  explorerUrl: chainId === 11155111 ? "https://sepolia.etherscan.io" : undefined,
};

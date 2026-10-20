import { createConfig, http } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors/injected";
import { mock } from "wagmi/connectors/mock";
import type { Address } from "viem";

import { appConfig } from "@/lib/config";

export const chain = appConfig.chainId === hardhat.id ? hardhat : sepolia;

/** Hardhat's well-known test accounts #1–#5 (account #0 deploys, #9 is the keeper). */
export const devAccounts: Address[] = [
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
];

export const wagmiConfig = createConfig({
  chains: [chain],
  // Only the configured chain is used; both keys keep the transports type complete.
  transports: { [sepolia.id]: http(appConfig.rpcUrl), [hardhat.id]: http(appConfig.rpcUrl) },
  connectors: [
    injected(),
    ...(appConfig.devAccounts
      ? devAccounts.map((address) => mock({ accounts: [address], features: { reconnect: true } }))
      : []),
  ],
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

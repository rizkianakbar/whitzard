import { createConfig, http } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors/injected";
import { mock } from "wagmi/connectors/mock";
import type { Address } from "viem";

import { appConfig } from "@/lib/config";

export const chain = appConfig.chainId === hardhat.id ? hardhat : sepolia;

/** Hardhat's well-known test accounts #1–#5 (account #0 deploys, #9 is the keeper). */
export const devAccounts: { address: Address; name: string }[] = [
  { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", name: "Akun uji 1" },
  { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", name: "Akun uji 2" },
  { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", name: "Akun uji 3" },
  { address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", name: "Akun uji 4" },
  { address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", name: "Akun uji 5" },
];

export const wagmiConfig = createConfig({
  chains: [chain],
  // Only the configured chain is used; both keys keep the transports type complete.
  transports: { [sepolia.id]: http(appConfig.rpcUrl), [hardhat.id]: http(appConfig.rpcUrl) },
  connectors: [
    injected(),
    ...(appConfig.devAccounts
      ? devAccounts.map((a) => mock({ accounts: [a.address], features: { reconnect: true } }))
      : []),
  ],
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

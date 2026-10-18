import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import WhitzardTokenModule from "./WhitzardToken.js";

// Registry reads token balances (Ready requires holding tokens). setEscrow is wired once the
// Escrow module exists; until then the escrow-only functions revert for everyone.
export default buildModule("RegistryModule", (m) => {
  const { token } = m.useModule(WhitzardTokenModule);
  const registry = m.contract("Registry", [token]);

  return { token, registry };
});

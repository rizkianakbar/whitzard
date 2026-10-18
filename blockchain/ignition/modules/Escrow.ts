import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import RegistryModule from "./Registry.js";

// Full stack: Token -> Registry -> Escrow, then the one-time Registry.setEscrow wiring.
// `useReadyFilter` = false deploys the no-Ready-filter variant for the RM5 comparison; it needs
// its own Registry (a Registry is wired to exactly one Escrow), so use a separate deployment id.
export default buildModule("EscrowModule", (m) => {
  const { token, registry } = m.useModule(RegistryModule);
  const useReadyFilter = m.getParameter("useReadyFilter", true);

  const escrow = m.contract("Escrow", [token, registry, useReadyFilter]);
  m.call(registry, "setEscrow", [escrow]);

  return { token, registry, escrow };
});

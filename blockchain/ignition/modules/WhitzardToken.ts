import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// No constructor arguments: no owner, no cap, no initial supply. Tokens come only from faucet().
export default buildModule("WhitzardTokenModule", (m) => {
  const token = m.contract("WhitzardToken", []);

  return { token };
});

import { network } from "hardhat";
import { formatEther, getAddress } from "viem";

// Claims from the WhitzardToken faucet with the first configured account and prints the
// account's faucet state.
//
//   TOKEN_ADDRESS=0x... pnpm hardhat run scripts/faucet.ts --network sepolia
//
// Without TOKEN_ADDRESS, a fresh token is deployed first (useful on the local simulated network).
const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const [wallet] = await viem.getWalletClients();
const account = wallet.account.address;

const token =
  process.env.TOKEN_ADDRESS !== undefined
    ? await viem.getContractAt("WhitzardToken", getAddress(process.env.TOKEN_ADDRESS))
    : await viem.deployContract("WhitzardToken");

console.log(`Token:   ${token.address}`);
console.log(`Account: ${account}`);

const now = (await publicClient.getBlock()).timestamp;
const nextClaimAt = await token.read.nextClaimAt([account]);
const claimed = await token.read.claimedTotal([account]);
const cap = await token.read.FAUCET_LIFETIME_CAP();

if (claimed >= cap) {
  console.log(`Lifetime cap of ${formatEther(cap)} WHZD already claimed.`);
} else if (now < nextClaimAt) {
  console.log(`On cooldown until ${new Date(Number(nextClaimAt) * 1000).toISOString()}.`);
} else {
  const hash = await token.write.faucet();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Claimed in block ${receipt.blockNumber} (tx ${hash}, gas ${receipt.gasUsed}).`);
}

console.log(`Balance:       ${formatEther(await token.read.balanceOf([account]))} WHZD`);
console.log(`Claimed total: ${formatEther(await token.read.claimedTotal([account]))} / ${formatEther(cap)} WHZD`);
console.log(`Next claim at: ${await token.read.nextClaimAt([account])}`);

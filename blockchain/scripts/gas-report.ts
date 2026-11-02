// Gas report (K3 a–c, K4 a–b; K4 c when reference prices are given).
//
//   pnpm hardhat run scripts/gas-report.ts
//   REF_GAS_PRICE_GWEI=… REF_ETH_PRICE=… REF_TOKEN_PRICE=… pnpm hardhat run scripts/gas-report.ts
//
// Runs on the local simulated network and measures real transactions (receipt `gasUsed`, which
// includes the 21,000 intrinsic gas and calldata). Writes reports/gas-report.md and .json.

import { mkdir, writeFile } from "node:fs/promises";

import { network } from "hardhat";
import {
  type Hash,
  type LocalAccount,
  formatEther,
  keccak256,
  parseEther,
  parseSignature,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const DAY = 24n * 60n * 60n;
const SHARE = parseEther("30");
const SCALING_SIZES = [10, 50, 100, 250, 500, 1000];
const CYCLE_CONTRIBUTORS = [1, 3, 10, 50];
const BLOCK_GAS_LIMITS = [30_000_000n, 36_000_000n, 45_000_000n, 60_000_000n];
// EIP-7825 (Osaka / Fusaka, live on Sepolia): no single transaction may use more than 2^24 gas.
const TX_GAS_CAP = 16_777_216n;
const K4_REGISTERED = 50;
const K4_READY = 10;
const K4_AMOUNT = parseEther("300");

const { viem, networkHelpers } = await network.create();
const publicClient = await viem.getPublicClient();
const chainId = await publicClient.getChainId();

async function gas(tx: Promise<Hash>): Promise<bigint> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: await tx });
  if (receipt.status !== "success") throw new Error(`transaction ${receipt.transactionHash} reverted`);
  return receipt.gasUsed;
}

function member(index: number): LocalAccount {
  return privateKeyToAccount(keccak256(toHex(`whitzard-gas-report-member-${index}`)));
}

const sum = (xs: bigint[]) => xs.reduce((a, b) => a + b, 0n);
const pct = (value: bigint, base: bigint) => {
  const p = ((Number(value) - Number(base)) / Number(base)) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
};
const fmt = (n: bigint) => n.toLocaleString("en-US");

// ------------------------------------------------------------------ deployment

const token = await viem.deployContract("WhitzardToken");
const registry = await viem.deployContract("Registry", [token.address]);
const escrow = await viem.deployContract("Escrow", [token.address, registry.address, true]);
await registry.write.setEscrow([escrow.address]);
const naive = await viem.deployContract("NaiveSnapshotEscrow");
const direct = await viem.deployContract("DirectTransferBaseline", [token.address]);

const members: LocalAccount[] = [];

/** Funds, registers and readies members until there are `count` of them (Escrow and naive). */
async function growMembersTo(count: number) {
  for (let i = members.length; i < count; i++) {
    const account = member(i);
    await networkHelpers.setBalance(account.address, parseEther("100"));
    await token.write.faucet({ account });
    await registry.write.register({ account });
    await registry.write.setReady([true], { account });
    await naive.write.register({ account });
    await naive.write.setReady([true], { account });
    members.push(account);
  }
  await networkHelpers.mine();
}

async function signPermit(owner: LocalAccount, spender: `0x${string}`, value: bigint) {
  const deadline = BigInt(await networkHelpers.time.latest()) + 3600n;
  const signature = await owner.signTypedData({
    domain: { name: await token.read.name(), version: "1", chainId, verifyingContract: token.address },
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    message: { owner: owner.address, spender, value, nonce: await token.read.nonces([owner.address]), deadline },
  });
  const { v, r, s } = parseSignature(signature);
  return { deadline, v: Number(v), r, s };
}

// ------------------------------------------------------------------ K3c: snapshot scaling

type ScalingRow = { members: number; escrowOpen: bigint; naiveOpen: bigint | null };
const scaling: ScalingRow[] = [];

// Every requester and contributor is a fresh member: a member's first request is free, and a
// fresh contributor keeps the measurements comparable.
let next = 0;
function take(): LocalAccount {
  if (next >= members.length) throw new Error("not enough members");
  return members[next++];
}

async function measureScaling(size: number) {
  await growMembersTo(size);
  const requester = take();
  const escrowOpen = await gas(
    escrow.write.openRequest([parseEther("1000"), DAY, keccak256(toHex(`scaling-${size}`)), 0n], { account: requester }),
  );
  const naiveOpen = await naiveOpenGas(requester);
  scaling.push({ members: size, escrowOpen, naiveOpen });
  console.log(`scaling: ${size} members  escrow ${fmt(escrowOpen)}  naive ${naiveOpen === null ? "does not fit" : fmt(naiveOpen)}`);
}

/** Gas of the naive openRequest, or null if it cannot be executed (over the per-transaction cap). */
async function naiveOpenGas(requester: LocalAccount): Promise<bigint | null> {
  try {
    return await gas(naive.write.openRequest([parseEther("1000")], { account: requester }));
  } catch {
    return null;
  }
}

for (const size of SCALING_SIZES.filter((s) => s <= 100)) await measureScaling(size);

// ------------------------------------------------------------------ K3a/b: functions and full cycle

type CycleRow = {
  contributors: number;
  open: bigint;
  contributeEach: bigint[];
  approvals: bigint[];
  permitEach: bigint[];
  finalize: bigint;
  finalizePermit: bigint;
  directEach: bigint[];
  transferEach: bigint[];
};
const cycles: CycleRow[] = [];

// Each cycle size needs 2 fresh requesters and 2c fresh contributors (approve run + permit run).
const cycleMembers = CYCLE_CONTRIBUTORS.reduce((total, c) => total + 2 + 2 * c, 0);
await growMembersTo(Math.max(members.length, next + cycleMembers));

for (const c of CYCLE_CONTRIBUTORS) {
  const n = BigInt(Number(await registry.read.readyCount()) - 1);
  const amount = SHARE * n; // share = 30 WHZD

  // Escrow with approve + contribute.
  const requesterA = take();
  const open = await gas(escrow.write.openRequest([amount, DAY, keccak256(toHex(`cycle-a-${c}`)), 0n], { account: requesterA }));
  const idA = await escrow.read.requestCount();
  const approvals: bigint[] = [];
  const contributeEach: bigint[] = [];
  const contributorsA = Array.from({ length: c }, take);
  for (const m of contributorsA) {
    approvals.push(await gas(token.write.approve([escrow.address, SHARE], { account: m })));
    contributeEach.push(await gas(escrow.write.contribute([idA], { account: m })));
  }

  // Escrow with contributeWithPermit (one transaction per contributor, no prior approval).
  const requesterB = take();
  await gas(escrow.write.openRequest([amount, DAY, keccak256(toHex(`cycle-b-${c}`)), 0n], { account: requesterB }));
  const idB = await escrow.read.requestCount();
  const permitEach: bigint[] = [];
  for (const m of Array.from({ length: c }, take)) {
    const p = await signPermit(m, escrow.address, SHARE);
    permitEach.push(await gas(escrow.write.contributeWithPermit([idB, p.deadline, p.v, p.r, p.s], { account: m })));
  }

  // Baselines: the same contributors send the share straight to the requester.
  const directEach: bigint[] = [];
  const transferEach: bigint[] = [];
  for (const m of contributorsA) {
    await gas(token.write.approve([direct.address, SHARE], { account: m }));
    directEach.push(await gas(direct.write.send([requesterA.address, SHARE], { account: m })));
    transferEach.push(await gas(token.write.transfer([requesterA.address, SHARE], { account: m })));
  }

  await networkHelpers.time.increase(DAY);
  const finalize = await gas(escrow.write.finalize([idA]));
  const finalizePermit = await gas(escrow.write.finalize([idB]));
  cycles.push({ contributors: c, open, contributeEach, approvals, permitEach, finalize, finalizePermit, directEach, transferEach });
  console.log(`cycle: ${c} contributors done`);
}

for (const size of SCALING_SIZES.filter((s) => s > 100 && s <= 500)) await measureScaling(size);

// Linear fit of the naive cost, then check the predicted ceiling on the real network: a snapshot
// of `maxMembers` members must still fit under the per-transaction cap, a few more must not.
const fitted = scaling.filter((r): r is ScalingRow & { naiveOpen: bigint } => r.naiveOpen !== null);
const first = fitted[0];
const last = fitted[fitted.length - 1];
const slope = (last.naiveOpen - first.naiveOpen) / BigInt(last.members - first.members);
const intercept = first.naiveOpen - slope * BigInt(first.members);
const capMaxMembers = Number((TX_GAS_CAP - intercept) / slope);

await growMembersTo(capMaxMembers);
const atCeiling = await naiveOpenGas(take());
await growMembersTo(capMaxMembers + 3);
const overCeiling = await naiveOpenGas(take());
console.log(`ceiling: ${capMaxMembers} members -> ${atCeiling}; ${capMaxMembers + 3} -> ${overCeiling}`);

for (const size of SCALING_SIZES.filter((s) => s > 500)) await measureScaling(size);

// ------------------------------------------------------------------ K4: with vs without the Ready filter

type K4Row = { filter: boolean; snapshotSize: bigint; share: bigint; open: bigint; contributions: bigint[]; finalize: bigint };
const k4: K4Row[] = [];
{
  const registries = {
    true: await viem.deployContract("Registry", [token.address]),
    false: await viem.deployContract("Registry", [token.address]),
  };
  const escrows = {
    true: await viem.deployContract("Escrow", [token.address, registries.true.address, true]),
    false: await viem.deployContract("Escrow", [token.address, registries.false.address, false]),
  };
  await registries.true.write.setEscrow([escrows.true.address]);
  await registries.false.write.setEscrow([escrows.false.address]);

  const k4Members = Array.from({ length: K4_REGISTERED }, (_, i) => member(100_000 + i));
  for (const [i, account] of k4Members.entries()) {
    await networkHelpers.setBalance(account.address, parseEther("100"));
    await token.write.faucet({ account });
    for (const filter of [true, false] as const) {
      await registries[`${filter}`].write.register({ account });
      // Member 0 is the requester (not Ready); members 1..K4_READY are Ready.
      if (i >= 1 && i <= K4_READY) await registries[`${filter}`].write.setReady([true], { account });
      await token.write.approve([escrows[`${filter}`].address, parseEther("100")], { account });
    }
  }
  await networkHelpers.mine();

  for (const filter of [true, false] as const) {
    const e = escrows[`${filter}`];
    const open = await gas(e.write.openRequest([K4_AMOUNT, DAY, keccak256(toHex(`k4-${filter}`)), 0n], { account: k4Members[0] }));
    const id = await e.read.requestCount();
    const request = await e.read.getRequest([id]);
    const contributions: bigint[] = [];
    for (const m of k4Members.slice(1)) {
      if (await e.read.canContribute([id, m.address])) contributions.push(await gas(e.write.contribute([id], { account: m })));
    }
    await networkHelpers.time.increase(DAY);
    const finalize = await gas(e.write.finalize([id]));
    k4.push({ filter, snapshotSize: request.snapshotSize, share: request.share, open, contributions, finalize });
  }
}

// ------------------------------------------------------------------ report

const lines: string[] = [];
const out = (s = "") => lines.push(s);
const avg = (xs: bigint[]) => (xs.length ? sum(xs) / BigInt(xs.length) : 0n);

out("# Whitzard gas report");
out();
out(`Generated by \`scripts/gas-report.ts\` on the local simulated network (${new Date().toISOString()}).`);
out("All numbers are real transaction gas (`gasUsed`), including the 21,000 intrinsic gas and calldata.");
out();

out("## K3a — gas per function (median over the cycle runs)");
out();
const median = (xs: bigint[]) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[Math.floor(xs.length / 2)];
out("| Function | Gas |");
out("| --- | ---: |");
out(`| \`Escrow.openRequest\` | ${fmt(median(cycles.map((c) => c.open)))} |`);
out(`| \`Escrow.contribute\` (after \`approve\`) | ${fmt(median(cycles.flatMap((c) => c.contributeEach)))} |`);
out(`| \`WhitzardToken.approve\` | ${fmt(median(cycles.flatMap((c) => c.approvals)))} |`);
out(`| \`Escrow.contributeWithPermit\` | ${fmt(median(cycles.flatMap((c) => c.permitEach)))} |`);
out(`| \`Escrow.finalize\` | ${fmt(median(cycles.map((c) => c.finalize)))} |`);
out(`| \`DirectTransferBaseline.send\` (after \`approve\`) | ${fmt(median(cycles.flatMap((c) => c.directEach)))} |`);
out(`| \`WhitzardToken.transfer\` (plain direct transfer) | ${fmt(median(cycles.flatMap((c) => c.transferEach)))} |`);
out();

out("## K3b — full cycle vs direct transfer, same number of contributors");
out();
out("Escrow cycle = `openRequest` + one contribution per contributor + `finalize`. Direct transfer = one");
out("`transfer` per contributor (no request, no pool, no rules). The permit variant needs no prior");
out("`approve`, like a plain transfer; the approve variant lists the approvals separately.");
out();
out("| Contributors | Escrow (permit) | Escrow (approve + contribute) | Direct `transfer` | Baseline `send` | Permit vs transfer | Approve-flow vs transfer |");
out("| ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
const cycleJson = cycles.map((c) => {
  const permitCycle = c.open + sum(c.permitEach) + c.finalizePermit;
  const approveCycle = c.open + sum(c.approvals) + sum(c.contributeEach) + c.finalize;
  const transfer = sum(c.transferEach);
  const baseline = sum(c.directEach);
  out(
    `| ${c.contributors} | ${fmt(permitCycle)} | ${fmt(approveCycle)} | ${fmt(transfer)} | ${fmt(baseline)} | ${pct(permitCycle, transfer)} | ${pct(approveCycle, transfer)} |`,
  );
  return { contributors: c.contributors, permitCycle, approveCycle, transfer, baseline };
});
out();

out("## K3c — `openRequest` gas vs snapshot size");
out();
out("| Members | Escrow (checkpoints) | Naive (loop + store) |");
out("| ---: | ---: | ---: |");
for (const r of scaling) {
  out(`| ${r.members} | ${fmt(r.escrowOpen)} | ${r.naiveOpen === null ? "does not fit in one transaction" : fmt(r.naiveOpen)} |`);
}
out();
out("The first Escrow row is higher only because the first request on a fresh contract also starts the");
out("request counter (a zero-to-non-zero storage write); it is not a snapshot cost.");
out();
out(`Naive cost grows by about **${fmt(slope)} gas per member** (linear fit from ${first.members} to ${last.members} members);`);
out(`Escrow's stays between ${fmt(scaling.reduce((m, r) => (r.escrowOpen < m ? r.escrowOpen : m), first.escrowOpen))} and ${fmt(scaling.reduce((m, r) => (r.escrowOpen > m ? r.escrowOpen : m), first.escrowOpen))}.`);
out();
out("Since Osaka (Fusaka, live on Sepolia) a single transaction may use at most 2^24 = 16,777,216 gas");
out("(EIP-7825), which is lower than the block gas limit, so the transaction cap is the binding limit.");
out();
out("| Limit | Max members, naive `openRequest` | Escrow |");
out("| --- | ---: | --- |");
out(
  `| Per-transaction cap, ${fmt(TX_GAS_CAP)} (binding) | **${fmt(BigInt(capMaxMembers))}** (checked: ${capMaxMembers} fits${atCeiling !== null ? ` at ${fmt(atCeiling)} gas` : " — NOT CONFIRMED"}, ${capMaxMembers + 3} ${overCeiling === null ? "does not" : "STILL FITS"}) | no limit (constant cost) |`,
);
const ceilings = BLOCK_GAS_LIMITS.map((limit) => {
  const max = (limit - intercept) / slope;
  out(`| Block gas limit ${fmt(limit)} (if it were the only limit) | ~${fmt(max)} | no limit (constant cost) |`);
  return { limit, maxMembers: max };
});
out();

out("## K4 — with vs without the Ready filter");
out();
out(`${K4_REGISTERED} registered members, ${K4_READY} of them Ready; the requester is not Ready; request of ${formatEther(K4_AMOUNT)} WHZD;`);
out("every member in the snapshot contributes.");
out();
out("| Ready filter | Snapshot size | Share (WHZD) | Contributions | Gas per cycle | Gas per contribution |");
out("| --- | ---: | ---: | ---: | ---: | ---: |");
for (const r of k4) {
  const cycle = r.open + sum(r.contributions) + r.finalize;
  out(
    `| ${r.filter ? "on" : "off"} | ${r.snapshotSize} | ${formatEther(r.share)} | ${r.contributions.length} | ${fmt(cycle)} | ${fmt(avg(r.contributions))} |`,
  );
}
out();

const gasPriceGwei = process.env.REF_GAS_PRICE_GWEI;
const ethPrice = process.env.REF_ETH_PRICE;
const tokenPrice = process.env.REF_TOKEN_PRICE;
if (gasPriceGwei && ethPrice && tokenPrice) {
  out("### K4c — contribution value / gas cost (reference prices)");
  out();
  out(`Reference prices: gas ${gasPriceGwei} gwei, 1 ETH = ${ethPrice}, 1 WHZD = ${tokenPrice} (same currency).`);
  out();
  out("| Ready filter | Contribution value | Gas cost of one contribution | Ratio |");
  out("| --- | ---: | ---: | ---: |");
  for (const r of k4) {
    const value = Number(formatEther(r.share)) * Number(tokenPrice);
    const cost = Number(avg(r.contributions)) * Number(gasPriceGwei) * 1e-9 * Number(ethPrice);
    out(`| ${r.filter ? "on" : "off"} | ${value.toFixed(4)} | ${cost.toFixed(4)} | ${(value / cost).toFixed(2)} |`);
  }
  out();
} else {
  out("K4c (contribution value / gas cost) needs reference prices: rerun with");
  out("`REF_GAS_PRICE_GWEI`, `REF_ETH_PRICE` and `REF_TOKEN_PRICE` set.");
  out();
}

const report = lines.join("\n");
console.log(`\n${report}`);
await mkdir("reports", { recursive: true });
await writeFile("reports/gas-report.md", report);
await writeFile(
  "reports/gas-report.json",
  JSON.stringify({ cycles: cycleJson, scaling, txGasCap: { cap: TX_GAS_CAP, maxMembers: capMaxMembers, atCeiling, overCeiling }, ceilings, k4 }, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2),
);
console.log("\nWrote reports/gas-report.md and reports/gas-report.json");

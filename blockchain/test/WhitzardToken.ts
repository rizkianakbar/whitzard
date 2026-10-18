import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

const FAUCET_AMOUNT = parseEther("100");
const FAUCET_COOLDOWN = 24n * 60n * 60n;

describe("WhitzardToken", async () => {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [alice, bob, spender] = await viem.getWalletClients();

  async function deployToken() {
    const token = await viem.deployContract("WhitzardToken");
    return { token };
  }

  // K1: the indexer rebuilds faucet history from logs spread over many blocks and days.
  it("FaucetClaimed logs across blocks add up to claimedTotal and totalSupply", async () => {
    const { token } = await networkHelpers.loadFixture(deployToken);
    const fromBlock = await publicClient.getBlockNumber();

    for (let i = 0; i < 3; i++) {
      await token.write.faucet({ account: alice.account });
      await token.write.faucet({ account: bob.account });
      await networkHelpers.time.increase(FAUCET_COOLDOWN);
    }

    const logs = await publicClient.getContractEvents({
      address: token.address,
      abi: token.abi,
      eventName: "FaucetClaimed",
      fromBlock,
      strict: true,
    });
    assert.equal(logs.length, 6);
    assert.equal(new Set(logs.map((log) => log.blockNumber)).size, 6);

    const totals = new Map<string, bigint>();
    for (const log of logs) {
      const account = log.args.account.toLowerCase();
      totals.set(account, (totals.get(account) ?? 0n) + log.args.amount);
    }

    for (const wallet of [alice, bob]) {
      const address = wallet.account.address;
      assert.equal(totals.get(address.toLowerCase()), 3n * FAUCET_AMOUNT);
      assert.equal(await token.read.claimedTotal([address]), 3n * FAUCET_AMOUNT);
    }
    assert.equal(await token.read.totalSupply(), 6n * FAUCET_AMOUNT);
  });

  // K2: the cooldown is enforced against real block timestamps.
  it("rejects a second claim until a full day of chain time has passed", async () => {
    const { token } = await networkHelpers.loadFixture(deployToken);

    await viem.assertions.emitWithArgs(
      token.write.faucet({ account: alice.account }),
      token,
      "FaucetClaimed",
      [alice.account.address, FAUCET_AMOUNT],
    );
    const next = await token.read.nextClaimAt([alice.account.address]);
    assert.equal(next, BigInt(await networkHelpers.time.latest()) + FAUCET_COOLDOWN);

    await viem.assertions.revertWithCustomErrorWithArgs(
      token.write.faucet({ account: alice.account }),
      token,
      "FaucetCooldown",
      [next],
    );

    await networkHelpers.time.setNextBlockTimestamp(next);
    await token.write.faucet({ account: alice.account });
    assert.equal(await token.read.balanceOf([alice.account.address]), 2n * FAUCET_AMOUNT);
  });

  // K1: a wallet-signed EIP-712 permit lets the spender pull tokens without an approve tx.
  it("accepts a permit signed with signTypedData and lets the spender pull in one tx", async () => {
    const { token } = await networkHelpers.loadFixture(deployToken);
    await token.write.faucet({ account: alice.account });

    const owner = alice.account.address;
    const value = parseEther("40");
    const deadline = BigInt(await networkHelpers.time.latest()) + 3600n;
    const nonce = await token.read.nonces([owner]);

    const signature = await alice.signTypedData({
      domain: {
        name: await token.read.name(),
        version: "1",
        chainId: await publicClient.getChainId(),
        verifyingContract: token.address,
      },
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
      message: { owner, spender: spender.account.address, value, nonce, deadline },
    });
    const r = `0x${signature.slice(2, 66)}` as const;
    const s = `0x${signature.slice(66, 130)}` as const;
    const v = Number.parseInt(signature.slice(130, 132), 16);

    // Anyone can submit the signature; the spender does it here, as Escrow will.
    await token.write.permit([owner, spender.account.address, value, deadline, v, r, s], {
      account: spender.account,
    });
    assert.equal(await token.read.allowance([owner, spender.account.address]), value);
    assert.equal(await token.read.nonces([owner]), nonce + 1n);

    await token.write.transferFrom([owner, spender.account.address, value], {
      account: spender.account,
    });
    assert.equal(await token.read.balanceOf([spender.account.address]), value);
    assert.equal(await token.read.balanceOf([owner]), FAUCET_AMOUNT - value);

    await viem.assertions.revertWithCustomError(
      token.write.permit([owner, spender.account.address, value, deadline, v, r, s], {
        account: spender.account,
      }),
      token,
      "ERC2612InvalidSigner",
    );
  });
});

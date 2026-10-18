import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("Registry", async () => {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const wallets = (await viem.getWalletClients()).slice(0, 5);

  async function deployRegistry() {
    const token = await viem.deployContract("WhitzardToken");
    const registry = await viem.deployContract("Registry", [token.address]);
    for (const wallet of wallets) {
      await token.write.faucet({ account: wallet.account });
      await registry.write.register({ account: wallet.account });
    }
    return { token, registry };
  }

  // K4: the indexer rebuilds Ready history from ReadyChanged logs; it must agree with the
  // on-chain checkpoints for every block, which is what Escrow snapshots read.
  it("ReadyChanged logs replayed per block reproduce readyCountAt and wasReadyAt", async () => {
    const { registry } = await networkHelpers.loadFixture(deployRegistry);
    const fromBlock = await publicClient.getBlockNumber();

    // Toggle members across blocks; some blocks hold several toggles, some none.
    const script: [number, boolean][] = [
      [0, true], [1, true], [2, true], [1, false], [3, true], [0, false], [4, true], [1, true],
    ];
    await networkHelpers.mine(2);
    for (const [i, [who, ready]] of script.entries()) {
      await registry.write.setReady([ready], { account: wallets[who].account });
      if (i % 3 === 2) await networkHelpers.mine(3);
    }
    await networkHelpers.mine();
    const toBlock = (await publicClient.getBlockNumber()) - 1n;

    const logs = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi,
      eventName: "ReadyChanged",
      fromBlock,
      strict: true,
    });
    assert.equal(logs.length, script.length);

    const ready = new Map<string, boolean>();
    let next = 0;
    for (let block = fromBlock; block <= toBlock; block++) {
      while (next < logs.length && logs[next].blockNumber === block) {
        ready.set(logs[next].args.member.toLowerCase(), logs[next].args.ready);
        next++;
      }
      const count = [...ready.values()].filter(Boolean).length;
      assert.equal(await registry.read.readyCountAt([block]), BigInt(count), `block ${block}`);
      for (const wallet of wallets) {
        const address = wallet.account.address;
        assert.equal(
          await registry.read.wasReadyAt([address, block]),
          ready.get(address.toLowerCase()) ?? false,
          `${address} at block ${block}`,
        );
      }
    }
    assert.equal(await registry.read.readyCount(), BigInt([...ready.values()].filter(Boolean).length));
  });

  // K2: a toggle cannot affect a snapshot of the block it lands in.
  it("rejects history lookups for the current block", async () => {
    const { registry } = await networkHelpers.loadFixture(deployRegistry);
    await registry.write.setReady([true], { account: wallets[0].account });
    const current = await publicClient.getBlockNumber();

    // eth_call runs in the latest block, so the block holding the toggle is not yet in the past.
    await viem.assertions.revertWithCustomErrorWithArgs(
      registry.read.readyCountAt([current]),
      registry,
      "FutureLookup",
      [current, current],
    );

    await networkHelpers.mine();
    assert.equal(await registry.read.readyCountAt([current]), 1n);
    assert.equal(await registry.read.readyCountAt([current - 1n]), 0n);
  });
});

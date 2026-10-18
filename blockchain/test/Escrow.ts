import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, parseEther, parseSignature, toHex } from "viem";

const DAY = 24n * 60n * 60n;
const EVIDENCE = keccak256(toHex("hospital-bill.pdf"));

describe("Escrow", async () => {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [deployer, alice, bob, carol, dave, keeper] =
    await viem.getWalletClients();
  const members = [alice, bob, carol, dave];

  async function deployStack() {
    const token = await viem.deployContract("WhitzardToken");
    const registry = await viem.deployContract("Registry", [token.address]);
    const escrow = await viem.deployContract("Escrow", [
      token.address,
      registry.address,
      true,
    ]);
    await registry.write.setEscrow([escrow.address], {
      account: deployer.account,
    });
    for (const member of members) {
      await token.write.faucet({ account: member.account });
      await registry.write.register({ account: member.account });
      await registry.write.setReady([true], { account: member.account });
    }
    await networkHelpers.mine();
    return { token, registry, escrow };
  }

  // K1: the whole demo flow as the frontend and keeper drive it, with wallet-signed permits.
  it("opens, collects permit contributions in one tx each, and the keeper finalizes", async () => {
    const { token, escrow } = await networkHelpers.loadFixture(deployStack);

    await escrow.write.openRequest([parseEther("90"), DAY, EVIDENCE, 0n], {
      account: alice.account,
    });
    const id = await escrow.read.requestCount();
    const request = await escrow.read.getRequest([id]);
    assert.equal(request.share, parseEther("30"));

    const chainId = await publicClient.getChainId();
    for (const member of [bob, carol]) {
      const owner = member.account.address;
      const permitDeadline = BigInt(await networkHelpers.time.latest()) + 3600n;
      const signature = await member.signTypedData({
        domain: {
          name: await token.read.name(),
          version: "1",
          chainId,
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
        message: {
          owner,
          spender: escrow.address,
          value: request.share,
          nonce: await token.read.nonces([owner]),
          deadline: permitDeadline,
        },
      });
      const { v, r, s } = parseSignature(signature);

      await viem.assertions.emitWithArgs(
        escrow.write.contributeWithPermit(
          [id, permitDeadline, Number(v), r, s],
          { account: member.account },
        ),
        escrow,
        "Contributed",
        [id, owner, request.share],
      );
    }

    // The keeper cannot finalize early, and can right at the deadline.
    assert.equal(await escrow.read.canFinalize([id]), false);
    await viem.assertions.revertWithCustomErrorWithArgs(
      escrow.write.finalize([id], { account: keeper.account }),
      escrow,
      "DeadlineNotReached",
      [id, request.deadline],
    );
    await networkHelpers.time.increaseTo(request.deadline);
    assert.equal(await escrow.read.canFinalize([id]), true);

    const before = await token.read.balanceOf([alice.account.address]);
    await escrow.write.finalize([id], { account: keeper.account });
    assert.equal(
      await token.read.balanceOf([alice.account.address]),
      before + parseEther("60"),
    );
    assert.equal(await token.read.balanceOf([escrow.address]), 0n);
    assert.equal(await escrow.read.status([id]), 2); // Finalized
  });

  // K2: cancellation moves no funds; contributors claim back exactly their share.
  it("lets contributors claim refunds after a cancel, and shows them as pending first", async () => {
    const { token, escrow } = await networkHelpers.loadFixture(deployStack);
    for (const member of members) {
      await token.write.approve([escrow.address, parseEther("100")], {
        account: member.account,
      });
    }

    await escrow.write.openRequest([parseEther("90"), DAY, EVIDENCE, 0n], {
      account: alice.account,
    });
    await escrow.write.openRequest([parseEther("60"), DAY, EVIDENCE, 0n], {
      account: carol.account,
    });
    await escrow.write.contribute([1n], { account: bob.account });
    await escrow.write.contribute([2n], { account: bob.account });
    await escrow.write.contribute([1n], { account: dave.account });

    await viem.assertions.emitWithArgs(
      escrow.write.cancelRequest([1n], { account: alice.account }),
      escrow,
      "RequestCancelled",
      [1n, alice.account.address, parseEther("60")],
    );

    // What the UI does: take the member's request ids from their Contributed logs, then ask once.
    const logs = await publicClient.getContractEvents({
      address: escrow.address,
      abi: escrow.abi,
      eventName: "Contributed",
      args: { member: bob.account.address },
      fromBlock: 0n,
      strict: true,
    });
    const ids = logs.map((log) => log.args.id);
    assert.deepEqual(ids, [1n, 2n]);
    const [total, amounts] = await escrow.read.pendingRefunds([
      bob.account.address,
      ids,
    ]);
    assert.equal(total, parseEther("30"));
    assert.deepEqual(amounts, [parseEther("30"), 0n]);

    const before = await token.read.balanceOf([bob.account.address]);
    await viem.assertions.emitWithArgs(
      escrow.write.claimRefund([1n], { account: bob.account }),
      escrow,
      "Refunded",
      [1n, bob.account.address, parseEther("30")],
    );
    assert.equal(
      await token.read.balanceOf([bob.account.address]),
      before + parseEther("30"),
    );
    assert.equal(
      await escrow.read.pendingRefund([1n, bob.account.address]),
      0n,
    );
    await viem.assertions.revertWithCustomErrorWithArgs(
      escrow.write.claimRefund([1n], { account: bob.account }),
      escrow,
      "NothingToRefund",
      [1n, bob.account.address],
    );

    // Dave's share is still held for him; request 2 is untouched.
    assert.equal(
      await escrow.read.pendingRefund([1n, dave.account.address]),
      parseEther("30"),
    );
    assert.equal(
      await token.read.balanceOf([escrow.address]),
      parseEther("30") + parseEther("20"),
    );
  });

  // K1: the indexer rebuilds every request from events alone; it must match on-chain state.
  it("request state rebuilt from events matches getRequest", async () => {
    const { token, escrow } = await networkHelpers.loadFixture(deployStack);
    for (const member of members) {
      await token.write.approve([escrow.address, parseEther("100")], {
        account: member.account,
      });
    }
    const fromBlock = await publicClient.getBlockNumber();

    await escrow.write.openRequest([parseEther("90"), DAY, EVIDENCE, 0n], {
      account: alice.account,
    });
    await escrow.write.openRequest([parseEther("30"), DAY, EVIDENCE, 0n], {
      account: bob.account,
    });
    await escrow.write.contribute([1n], { account: bob.account });
    await networkHelpers.mine(2);
    await escrow.write.contribute([1n], { account: carol.account });
    await escrow.write.contribute([2n], { account: dave.account });
    await escrow.write.cancelRequest([2n], { account: bob.account });
    await escrow.write.claimRefund([2n], { account: dave.account });
    await networkHelpers.time.increase(DAY);
    await escrow.write.finalize([1n], { account: keeper.account });

    type Row = {
      requester: string;
      share: bigint;
      collected: bigint;
      refunded: bigint;
      status: string;
    };
    const rows = new Map<bigint, Row>();
    // Every event after RequestOpened must refer to a request the indexer has already seen.
    const rowOf = (id: bigint): Row => {
      const row = rows.get(id);
      assert.ok(row, `event for unknown request ${id}`);
      return row;
    };
    const events = await publicClient.getContractEvents({
      address: escrow.address,
      abi: escrow.abi,
      fromBlock,
      strict: true,
    });
    for (const event of events) {
      switch (event.eventName) {
        case "RequestOpened":
          rows.set(event.args.id, {
            requester: event.args.requester,
            share: event.args.share,
            collected: 0n,
            refunded: 0n,
            status: "Open",
          });
          break;
        case "Contributed": {
          const row = rowOf(event.args.id);
          row.collected += event.args.amount;
          row.status = "Funding";
          break;
        }
        case "RequestCancelled":
          rowOf(event.args.id).status = "Cancelled";
          break;
        case "Refunded":
          rowOf(event.args.id).refunded += event.args.amount;
          break;
        case "RequestFinalized":
          rowOf(event.args.id).status =
            event.args.total > 0n ? "Finalized" : "Expired";
          break;
      }
    }

    const statusNames = [
      "Open",
      "Funding",
      "Finalized",
      "Expired",
      "Cancelled",
    ];
    for (const [id, row] of rows) {
      const onChain = await escrow.read.getRequest([id]);
      assert.equal(row.requester, onChain.requester);
      assert.equal(row.share, onChain.share);
      assert.equal(row.collected, onChain.collected);
      assert.equal(row.refunded, onChain.refunds * onChain.share);
      assert.equal(row.status, statusNames[onChain.status]);
    }
    assert.equal(rowOf(1n).status, "Finalized");
    assert.equal(rowOf(2n).status, "Cancelled");
  });
});

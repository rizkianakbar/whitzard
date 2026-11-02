# Design decisions

The choices behind the contracts, and the alternatives they replaced.

## No admin, ever

There is no `Ownable`, no pause, no upgrade proxy and no rescue function. Funds leave the Escrow
only through `finalize` (to the requester) or `claimRefund` (to a contributor). The one setup step,
`Registry.setEscrow`, can be called once, only by the deployer, and then locks forever.

**Why:** the point of the project is that nobody can hold back or redirect the money. Any admin
key, however well meant, would bring back the trusted middleman the design removes.

## Snapshot by block number, not by copying members

When a request opens, the members asked to help are the ones who were _Ready_ at the previous
block. The Registry keeps each member's Ready history, and the total Ready count, with
OpenZeppelin `Checkpoints`. `openRequest` reads one number; contributions check membership with one
lookup.

**Alternative:** copy every Ready member into the request when it opens. That costs about
27,100 gas per member, so it stops fitting in one transaction at **614 members** (EIP-7825 caps a
transaction at 16,777,216 gas). With checkpoints, `openRequest` costs roughly the same at any size.
Both designs are measured side by side in [`blockchain/`](../blockchain/README.md).

Using the _previous_ block means nobody can turn Ready on or off in the same block to get into, or
out of, a request.

## Equal shares, paid out whatever was collected

`share = amount / n`, rounded down, and every member in the snapshot is asked for exactly that.
At the deadline the requester gets everything collected, even if the request was only partly
funded. An inflated request is easy to spot, because it shows up as a large share for everyone.

## One transaction to contribute

Contributions use EIP-2612 `permit`: the member signs an approval and `contributeWithPermit` uses
it in the same transaction. The permit call is wrapped in `try/catch`, so someone who copies the
signature and submits it first cannot block the contribution.

## Anyone can finalize

`finalize(id)` has no caller check. The backend keeper calls it right after the deadline, but if
the keeper is down, the requester or anyone else can call it. The keeper's wallet only pays gas.

## Refunds are pulled, not pushed

Cancelling moves no funds; each contributor then calls `claimRefund(id)`. Paying everyone back in
one loop would cost more with every contributor and could be blocked by a single failing
transfer.

## Help before asking again

A member's first request is free. After that, they need to have contributed to someone else's
request since their last one. The requester names that contribution as proof (`proofId`), and the
Registry checks it with a round counter, without a loop. Cancelling a request invalidates every
contribution to it as proof at once.

**Alternative:** "eligible forever after one contribution". It deadlocks at launch, because
nobody can contribute until someone has asked.

## Evidence off-chain, its fingerprint on-chain

Medical documents are personal, so they stay in the backend and only the requester and the
members asked to help can open them. The SHA-256 hash goes on-chain with the request, so anyone
can check that the document they see is the one the request was opened with.

## Reentrancy

Every function that sends tokens sets its state first and is `nonReentrant`. The test suite
includes a deliberately vulnerable escrow and an attacker contract: the attack drains the
vulnerable version and fails against `Escrow`.

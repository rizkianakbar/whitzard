"use client";

import { useConfig } from "wagmi";
import { writeContract } from "wagmi/actions";

import { FAUCET_CAP } from "@/features/top-up/top-up.lib";
import { useTx } from "@/features/tx/tx.hooks";
import { api, type Member } from "@/lib/api";
import { token } from "@/lib/contracts";
import { useI18n } from "@/lib/i18n";
import { useNow } from "@/lib/now";
import { keys } from "@/lib/query-keys";

/** The faucet, presented as topping up: real money is never involved. */
export function useFaucet(me: Member) {
  const config = useConfig();
  const { t, fmt } = useI18n();
  const tx = useTx();
  const now = useNow();
  const next = Number(me.chain.faucetNextClaimAt) * 1000;
  const capped = BigInt(me.chain.faucetClaimed) >= FAUCET_CAP;
  const canClaim = !capped && next <= now;
  const wait = capped ? t.topUp.capped : t.topUp.nextClaim(fmt.weekdayTime(new Date(next)));

  const claim = () =>
    tx.run({
      prompt: { title: t.topUp.prompt, detail: t.wallet.call("WhitzardToken", "faucet", t.topUp.promptDetail) },
      send: () => writeContract(config, { ...token, functionName: "faucet" }),
      synced: async () => (await api.member(me.address)).chain.balance !== me.chain.balance,
      success: t.topUp.success,
      invalidate: [keys.member(me.address)],
    });

  return { tx, canClaim, wait, claim };
}

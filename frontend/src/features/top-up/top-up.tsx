"use client";

import { type ReactElement, useState } from "react";
import { FlaskConical } from "lucide-react";
import { sepolia } from "viem/chains";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useFaucet } from "@/features/top-up/top-up.hooks";
import { SEPOLIA_FAUCET } from "@/features/top-up/top-up.lib";
import { TxLabel } from "@/features/tx/tx-label";
import type { Member } from "@/lib/api";
import { chain } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

/** Explains that Whitzard is a testnet demo, so balances come from a free faucet. */
export function TestnetNotice() {
  const { t } = useI18n();
  return (
    <div className="flex gap-3 rounded-2xl bg-kunyit-soft p-4 text-kunyit-ink">
      <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-1.5 text-sm leading-relaxed">
        <p className="font-semibold">{t.topUp.noticeTitle}</p>
        <p>{t.topUp.notice(chain.name)}</p>
      </div>
    </div>
  );
}

type TopUpDialogProps = {
  me: Member;
  trigger: ReactElement;
};

export function TopUpDialog(props: TopUpDialogProps) {
  const { me, trigger } = props;
  const [open, setOpen] = useState(false);
  const { t, fmt } = useI18n();
  const { tx, canClaim, wait, claim } = useFaucet(me);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="gap-5 rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t.common.topUp}</DialogTitle>
          <DialogDescription className="text-batu">
            {t.topUp.current(<strong className="tabular text-arang">{fmt.whzd(me.chain.balance)} WHZD</strong>)}
          </DialogDescription>
        </DialogHeader>
        <TestnetNotice />
        <div className="flex flex-col gap-1 rounded-2xl border p-4">
          <span className="tabular text-3xl font-extrabold tracking-tight">+100 WHZD</span>
          <span className="text-sm leading-relaxed text-batu">{t.topUp.faucet}</span>
        </div>
        {canClaim ? (
          <Button
            size="lg"
            disabled={tx.busy}
            onClick={async () => {
              if (await claim()) setOpen(false);
            }}
          >
            <TxLabel tx={tx}>{t.topUp.claim}</TxLabel>
          </Button>
        ) : (
          <p className="rounded-2xl bg-muted p-4 text-sm text-batu">{wait}</p>
        )}
        {chain.id === sepolia.id && (
          <p className="text-[13px] leading-relaxed text-batu">
            {t.topUp.eth(
              chain.name,
              <a href={SEPOLIA_FAUCET} target="_blank" rel="noreferrer" className="font-semibold text-pandan underline underline-offset-4">
                {t.topUp.ethLink}
              </a>,
            )}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

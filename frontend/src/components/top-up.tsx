"use client";

import { type ReactElement, useState } from "react";
import { FlaskConical } from "lucide-react";
import { useConfig } from "wagmi";
import { writeContract } from "wagmi/actions";
import { sepolia } from "wagmi/chains";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api, type Member } from "@/lib/api";
import { token } from "@/lib/contracts";
import { formatWhzd } from "@/lib/format";
import { useNow } from "@/lib/now";
import { keys } from "@/lib/queries";
import { phaseLabel, useTx } from "@/lib/tx";
import { chain } from "@/lib/wagmi";

const CAP = 1000n * 10n ** 18n;
const SEPOLIA_FAUCET = "https://cloud.google.com/application/web3/faucet/ethereum/sepolia";

/** The faucet, presented as topping up: real money is never involved. */
export function useFaucet(me: Member) {
  const config = useConfig();
  const tx = useTx();
  const now = useNow();
  const next = Number(me.chain.faucetNextClaimAt) * 1000;
  const capped = BigInt(me.chain.faucetClaimed) >= CAP;
  const canClaim = !capped && next <= now;
  const wait = capped
    ? "Kamu sudah mengambil batas 1.000 WHZD untuk dompet ini."
    : `Bisa ambil lagi ${new Date(next).toLocaleString("id-ID", { weekday: "long", hour: "2-digit", minute: "2-digit" })}.`;

  const claim = () =>
    tx.run({
      send: () => writeContract(config, { ...token, functionName: "faucet" }),
      synced: async () => (await api.member(me.address)).chain.balance !== me.chain.balance,
      success: "100 WHZD masuk ke saldomu.",
      invalidate: [keys.member(me.address)],
    });

  return { tx, canClaim, wait, claim };
}

/** Explains that Whitzard is a testnet demo, so balances come from a free faucet. */
export function TestnetNotice() {
  return (
    <div className="flex gap-3 rounded-2xl bg-kunyit-soft p-4 text-kunyit-ink">
      <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-1.5 text-sm leading-relaxed">
        <p className="font-semibold">Ini versi uji coba</p>
        <p>
          Whitzard sedang diuji di jaringan {chain.name}, bagian dari penelitian skripsi. WHZD di sini tidak bernilai uang,
          tidak bisa dibeli, dan tidak bisa dicairkan. Kamu tidak perlu membayar apa pun.
        </p>
      </div>
    </div>
  );
}

export function TopUpDialog({ me, trigger }: { me: Member; trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  const { tx, canClaim, wait, claim } = useFaucet(me);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="gap-5 rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Isi saldo</DialogTitle>
          <DialogDescription className="text-batu">
            Saldomu sekarang <strong className="tabular text-arang">{formatWhzd(me.chain.balance)} WHZD</strong>.
          </DialogDescription>
        </DialogHeader>
        <TestnetNotice />
        <div className="flex flex-col gap-1 rounded-2xl border p-4">
          <span className="tabular text-3xl font-extrabold tracking-tight">+100 WHZD</span>
          <span className="text-sm leading-relaxed text-batu">
            Gratis dari faucet uji coba. Sekali setiap 24 jam, paling banyak 1.000 WHZD per dompet.
          </span>
        </div>
        {canClaim ? (
          <Button
            size="lg"
            disabled={tx.busy}
            onClick={async () => {
              if (await claim()) setOpen(false);
            }}
          >
            {tx.busy ? phaseLabel[tx.phase] : "Ambil 100 WHZD gratis"}
          </Button>
        ) : (
          <p className="rounded-2xl bg-muted p-4 text-sm text-batu">{wait}</p>
        )}
        {chain.id === sepolia.id && (
          <p className="text-[13px] leading-relaxed text-batu">
            Setiap transaksi butuh sedikit ETH {chain.name} untuk biaya jaringan, juga gratis. Kalau dompetmu kosong,{" "}
            <a href={SEPOLIA_FAUCET} target="_blank" rel="noreferrer" className="font-semibold text-pandan underline underline-offset-4">
              ambil ETH uji di sini
            </a>
            .
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

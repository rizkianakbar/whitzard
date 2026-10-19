"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock, FileText, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "wagmi";
import { readContract, signTypedData, writeContract } from "wagmi/actions";
import { bytesToHex, parseSignature } from "viem";

import { Avatar, callName } from "@/components/avatar";
import { ShareGrid, ShareLegend } from "@/components/share-grid";
import { StatusBadge } from "@/components/status-badge";
import { TopUpDialog } from "@/components/top-up";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError, type RequestDetail as Detail } from "@/lib/api";
import { appConfig } from "@/lib/config";
import { escrow, token } from "@/lib/contracts";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatWhzd, shortAddress, timeLeft } from "@/lib/format";
import { keys, useMe, useMember, useRequest } from "@/lib/queries";
import { useNow } from "@/lib/now";
import { useSession } from "@/lib/session";
import { phaseLabel, useTx } from "@/lib/tx";
import { chain } from "@/lib/wagmi";

export function RequestDetail({ id }: { id: number }) {
  const { data, error, isPending } = useRequest(id);
  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (error) {
    return (
      <div className="flex max-w-xl flex-col gap-3 rounded-3xl border bg-card p-8">
        <h1 className="text-xl font-semibold">Permintaan tidak ditemukan</h1>
        <p className="text-batu">
          {error instanceof ApiError && error.status === 404
            ? "Mungkin baru saja dibuat dan belum tercatat. Coba muat ulang sebentar lagi."
            : errorMessage(error)}
        </p>
        <Link href="/permintaan" className="font-semibold underline underline-offset-4">
          Semua permintaan
        </Link>
      </div>
    );
  }
  return <View detail={data} />;
}

function View({ detail }: { detail: Detail }) {
  const { request: r, responses, you } = detail;
  const { data: requester } = useMember(r.requester);
  const [justContributed, setJustContributed] = useState(false);
  const name = callName(requester?.profile, shortAddress(r.requester));

  return (
    <div className="flex flex-wrap items-start gap-10">
      <article className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
        <div className="flex flex-col gap-3.5">
          <Link href="/permintaan" className="self-start text-sm font-semibold text-batu hover:text-pandan">
            Semua permintaan
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge request={r} />
            <span className="text-[13px] text-batu">Permintaan nomor {r.id}</span>
          </div>
          <h1 className="max-w-160 text-[39px] leading-[1.1] font-extrabold text-pandan">
            {r.title ?? `Permintaan nomor ${r.id}`}
          </h1>
          <div className="flex items-center gap-3">
            <Avatar address={r.requester} profile={requester?.profile} className="size-12" />
            <span className="leading-snug">
              <span className="font-semibold">{name}</span>
              {requester?.profile?.city && <span className="text-batu">, {requester.profile.city}</span>}
              <br />
              <span className="text-sm text-batu">Diajukan {formatDate(r.openedAt)}</span>
            </span>
          </div>
        </div>

        {r.description && <p className="max-w-160 leading-[1.7] whitespace-pre-line">{r.description}</p>}

        <section aria-labelledby="grid" className="flex flex-col gap-5 rounded-3xl border bg-card p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="grid" className="text-xl font-bold">
              {r.contributors} dari {r.snapshotSize} anggota sudah membantu
            </h2>
            <span className="tabular">
              <strong className="font-bold">{formatWhzd(r.collected)}</strong> dari {formatWhzd(r.amount)} WHZD
            </span>
          </div>
          <ShareGrid
            size={r.snapshotSize}
            contributed={responses.contributed}
            declined={responses.declined}
            you={you?.inSnapshot ? you.response : null}
            justContributed={justContributed}
          />
          <ShareLegend />
          <p className="text-[13px] leading-relaxed text-batu">
            Anggota dihitung saat permintaan dibuat: {r.snapshotSize} orang yang sedang siap membantu, tidak termasuk{" "}
            {name}. Setiap orang diminta bagian yang sama.
          </p>
        </section>

        <Evidence detail={detail} requesterName={name} />
        <History detail={detail} />
      </article>

      <aside aria-label="Tindakan" className="flex min-w-0 flex-[1_1_320px] flex-col gap-5 rounded-3xl border bg-card p-7 lg:sticky lg:top-24">
        <Actions detail={detail} requesterName={name} onContributed={() => setJustContributed(true)} />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- evidence

function Evidence({ detail, requesterName }: { detail: Detail; requesterName: string }) {
  const { token: session } = useSession();
  const [check, setCheck] = useState<"idle" | "loading" | "match" | "mismatch">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const r = detail.request;
  const allowed = detail.you?.isRequester || detail.you?.inSnapshot;

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  // Fetch, then check the SHA-256 against the hash recorded on-chain before offering the document.
  // Opening it is a separate, direct click on a link, so popup blockers never get in the way.
  const fetchAndCheck = async () => {
    setCheck("loading");
    try {
      const { blob } = await api.evidence(session!, r.id);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
      setCheck(bytesToHex(digest) === r.evidenceHash.toLowerCase() ? "match" : "mismatch");
      setUrl(URL.createObjectURL(blob));
    } catch (error) {
      setCheck("idle");
      toast.error(errorMessage(error));
    }
  };

  return (
    <section aria-labelledby="evidence" className="flex flex-col gap-3.5">
      <h2 id="evidence" className="text-xl font-bold">
        Bukti
      </h2>
      <div className="flex flex-wrap items-center gap-4 rounded-3xl border bg-card p-5">
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl bg-pandan-soft text-pandan">
          <FileText className="size-5.5" />
        </span>
        <div className="flex min-w-60 flex-1 flex-col gap-1" aria-live="polite">
          <span className="font-semibold">{r.hasEvidence ? "Dokumen bukti" : "Dokumen tidak tersedia"}</span>
          {check === "match" && (
            <span className="flex items-center gap-1.5 text-[13px] text-daun-ink">
              <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
              Cocok dengan sidik yang tercatat di blockchain
            </span>
          )}
          {check === "mismatch" && (
            <span className="flex items-center gap-1.5 text-[13px] text-bata-ink">
              <TriangleAlert aria-hidden="true" className="size-4" />
              Tidak cocok dengan sidik di blockchain: dokumen ini sudah diubah
            </span>
          )}
          {(check === "idle" || check === "loading") && (
            <span className="tabular text-[13px] text-batu">Sidik di blockchain: {shortAddress(r.evidenceHash)}</span>
          )}
        </div>
        {r.hasEvidence && allowed && !url && (
          <Button variant="outline" disabled={check === "loading"} onClick={() => void fetchAndCheck()}>
            {check === "loading" ? "Memeriksa" : "Periksa dokumen"}
          </Button>
        )}
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            Lihat dokumen
          </a>
        )}
      </div>
      <p className="text-[13px] text-batu">
        {allowed
          ? `Hanya ${requesterName} dan anggota yang diminta membantu yang bisa membuka dokumen ini. Dokumen diperiksa dengan sidiknya di blockchain sebelum dibuka.`
          : `Dokumen ini hanya untuk ${requesterName} dan anggota yang diminta membantu.`}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- history

function TxLink({ hash, children }: { hash: string; children: React.ReactNode }) {
  if (!appConfig.explorerUrl) return <span className="text-[13px] text-batu">{children}</span>;
  return (
    <a href={`${appConfig.explorerUrl}/tx/${hash}`} target="_blank" rel="noreferrer" className="text-[13px] text-batu underline underline-offset-4">
      {children}
    </a>
  );
}

function History({ detail }: { detail: Detail }) {
  const r = detail.request;
  const rows: { text: React.ReactNode; when: string; tx: string }[] = [
    { text: <>Permintaan dibuka untuk <strong className="tabular">{formatWhzd(r.amount)} WHZD</strong></>, when: r.openedAt, tx: r.openedTx },
  ];
  if (r.cancelledAt && r.cancelledTx) rows.unshift({ text: "Permintaan dibatalkan oleh peminta", when: r.cancelledAt, tx: r.cancelledTx });
  if (r.finalizedAt && r.finalizedTx) {
    rows.unshift({
      text:
        r.status === "expired" ? "Berakhir tanpa iuran" : <>Dana <strong className="tabular">{formatWhzd(r.collected)} WHZD</strong> diteruskan ke peminta</>,
      when: r.finalizedAt,
      tx: r.finalizedTx,
    });
  }
  return (
    <section aria-labelledby="history" className="flex flex-col">
      <h2 id="history" className="mb-2 text-xl font-bold">
        Riwayat
      </h2>
      <ul>
        {rows.map((row) => (
          <li key={row.tx} className="flex flex-wrap justify-between gap-2 border-b py-3.5">
            <span>{row.text}</span>
            <TxLink hash={row.tx}>{formatDate(row.when)}</TxLink>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[13px] text-batu">
        Setiap baris adalah transaksi publik di {chain.name}
        {appConfig.explorerUrl ? ". Ketuk waktunya untuk melihatnya di Etherscan." : "."}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- actions

function Actions({ detail, requesterName, onContributed }: { detail: Detail; requesterName: string; onContributed: () => void }) {
  const { request: r, you } = detail;
  const left = timeLeft(r.deadline, useNow());
  const open = (r.status === "open" || r.status === "funding") && !r.awaitingFinalize && left !== null;

  if (r.status === "finalized") {
    return (
      <Summary title="Dana sudah diteruskan">
        <strong className="tabular">{formatWhzd(r.collected)} WHZD</strong> sampai ke {requesterName}
        {r.finalizedAt ? ` pada ${formatDate(r.finalizedAt)}` : ""}.
      </Summary>
    );
  }
  if (r.status === "expired") {
    return <Summary title="Berakhir">Waktu pengumpulan habis tanpa iuran, jadi tidak ada dana yang diteruskan.</Summary>;
  }
  if (r.status === "cancelled") return <Cancelled detail={detail} requesterName={requesterName} />;
  if (r.awaitingFinalize || left === null) return <AwaitingFinalize detail={detail} requesterName={requesterName} />;

  if (you?.isRequester) return <RequesterPanel detail={detail} left={left} />;
  if (!you?.inSnapshot) {
    return (
      <Summary title="Kamu tidak termasuk di permintaan ini">
        Permintaan ini hanya ditujukan ke anggota yang sedang siap membantu saat permintaan dibuat.
      </Summary>
    );
  }
  if (you.response === "contributed") {
    return (
      <Summary title="Iuranmu sudah tercatat">
        Terima kasih. <strong className="tabular">{formatWhzd(r.share)} WHZD</strong> ikut diteruskan ke {requesterName} saat
        waktu habis.
      </Summary>
    );
  }
  return open ? <ContributePanel detail={detail} requesterName={requesterName} left={left} onContributed={onContributed} /> : null;
}

function Summary({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="leading-relaxed text-batu">{children}</p>
    </div>
  );
}

function Deadline({ left, deadline }: { left: string; deadline: string }) {
  return (
    <div className="flex items-center gap-2.5 border-y py-3.5">
      <Clock aria-hidden="true" className="size-5 shrink-0" />
      <span className="leading-snug">
        Ditutup dalam <strong className="tabular">{left}</strong>
        <br />
        <span className="text-[13px] text-batu">{formatDate(deadline)}</span>
      </span>
    </div>
  );
}

const permitTypes = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

function ContributePanel({
  detail,
  requesterName,
  left,
  onContributed,
}: {
  detail: Detail;
  requesterName: string;
  left: string;
  onContributed: () => void;
}) {
  const config = useConfig();
  const { address, token: session } = useSession();
  const { data: me } = useMe();
  const tx = useTx();
  const { request: r, you } = detail;
  const id = BigInt(r.id);
  const share = BigInt(r.share);
  const enough = me ? BigInt(me.chain.balance) >= share : true;

  const contribute = async () => {
    // Recording the intent is a courtesy for the requester; the chain decides.
    void api.respond(session!, r.id, "participate").catch(() => undefined);
    const receipt = await tx.run({
      send: async () => {
        const allowance = await readContract(config, { ...token, functionName: "allowance", args: [address!, escrow.address] });
        if (allowance >= share) return writeContract(config, { ...escrow, functionName: "contribute", args: [id] });
        // One transaction: approve by signature (EIP-2612) inside the contribution.
        const [name, nonce] = await Promise.all([
          readContract(config, { ...token, functionName: "name" }),
          readContract(config, { ...token, functionName: "nonces", args: [address!] }),
        ]);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const signature = await signTypedData(config, {
          domain: { name, version: "1", chainId: chain.id, verifyingContract: token.address },
          types: permitTypes,
          primaryType: "Permit",
          message: { owner: address!, spender: escrow.address, value: share, nonce, deadline },
        });
        const { v, r: sigR, s } = parseSignature(signature);
        return writeContract(config, {
          ...escrow,
          functionName: "contributeWithPermit",
          args: [id, deadline, Number(v ?? 27n), sigR, s],
        });
      },
      synced: async () => (await api.request(r.id, session)).you?.response === "contributed",
      success: `Iuranmu ${formatWhzd(r.share)} WHZD tercatat. Terima kasih.`,
      invalidate: [keys.request(r.id), ["requests"], ["member"]],
    });
    if (receipt) onContributed();
  };

  const decline = async () => {
    try {
      await api.respond(session!, r.id, "decline");
      toast("Kamu tidak ikut membantu permintaan ini.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-batu">Bagianmu</span>
        <span className="tabular text-[49px] leading-none font-bold tracking-tighter">
          {formatWhzd(r.share)} <span className="text-xl font-semibold tracking-normal">WHZD</span>
        </span>
        <span className="text-[13px] leading-relaxed text-batu">
          Sama untuk semua: {formatWhzd(r.amount)} WHZD dibagi {r.snapshotSize} anggota.
        </span>
      </div>
      <Deadline left={left} deadline={r.deadline} />
      {you?.response === "declined" && (
        <p className="text-[13px] text-batu">Kamu memilih tidak ikut. Kamu masih bisa berubah pikiran sampai waktunya habis.</p>
      )}
      <div className="flex flex-col gap-2.5">
        <Button size="lg" className="tabular" disabled={tx.busy || !enough} onClick={() => void contribute()}>
          {tx.busy ? phaseLabel[tx.phase] : `Bantu ${formatWhzd(r.share)} WHZD`}
        </Button>
        {you?.response !== "declined" && (
          <Button variant="outline" disabled={tx.busy} onClick={() => void decline()}>
            Tidak kali ini
          </Button>
        )}
      </div>
      {!enough && me && (
        <div className="flex flex-col gap-2 rounded-2xl bg-bata-soft p-4 text-sm text-bata-ink">
          <p>Saldomu {formatWhzd(me.chain.balance)} WHZD, kurang dari bagianmu.</p>
          <TopUpDialog me={me} trigger={<button type="button" className="self-start font-semibold underline underline-offset-4">Isi saldo</button>} />
        </div>
      )}
      <p className="text-[13px] leading-relaxed text-batu">
        Dana disimpan di kontrak dan diteruskan ke {requesterName} saat waktu habis, berapa pun yang terkumpul. Kalau
        permintaan dibatalkan, kamu bisa mengambilnya kembali.
      </p>
    </>
  );
}

function RequesterPanel({ detail, left }: { detail: Detail; left: string }) {
  const config = useConfig();
  const { token: session } = useSession();
  const tx = useTx();
  const r = detail.request;

  const cancel = () =>
    tx.run({
      send: () => writeContract(config, { ...escrow, functionName: "cancelRequest", args: [BigInt(r.id)] }),
      synced: async () => (await api.request(r.id, session)).request.status === "cancelled",
      success: "Permintaan dibatalkan. Anggota bisa mengambil iurannya kembali.",
      invalidate: [keys.request(r.id), ["requests"], keys.proof],
    });

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-batu">Terkumpul untukmu</span>
        <span className="tabular text-[49px] leading-none font-bold tracking-tighter">
          {formatWhzd(r.collected)} <span className="text-xl font-semibold tracking-normal">WHZD</span>
        </span>
        <span className="text-[13px] text-batu">dari {formatWhzd(r.amount)} WHZD yang kamu minta</span>
      </div>
      <Deadline left={left} deadline={r.deadline} />
      <p className="text-[13px] leading-relaxed text-batu">
        Saat waktu habis, semua yang terkumpul diteruskan ke dompetmu secara otomatis, berapa pun jumlahnya.
      </p>
      <Dialog>
        <DialogTrigger render={<Button variant="outline" disabled={tx.busy}>{tx.busy ? phaseLabel[tx.phase] : "Batalkan permintaan"}</Button>} />
        <DialogContent className="gap-5 p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Batalkan permintaan ini?</DialogTitle>
            <DialogDescription className="leading-relaxed text-batu">
              Tidak ada dana yang diteruskan kepadamu. Setiap anggota bisa mengambil kembali iurannya. Pembatalan tidak
              bisa diurungkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline">Kembali</Button>} />
            <DialogClose render={<Button variant="destructive" onClick={() => void cancel()}>Batalkan permintaan</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AwaitingFinalize({ detail, requesterName }: { detail: Detail; requesterName: string }) {
  const config = useConfig();
  const { token: session } = useSession();
  const tx = useTx();
  const r = detail.request;
  return (
    <>
      <Summary title="Waktu sudah habis">
        <strong className="tabular">{formatWhzd(r.collected)} WHZD</strong> sedang diteruskan ke {requesterName}. Biasanya
        selesai dalam beberapa menit.
      </Summary>
      <Button
        variant="outline"
        disabled={tx.busy}
        onClick={() =>
          void tx.run({
            send: () => writeContract(config, { ...escrow, functionName: "finalize", args: [BigInt(r.id)] }),
            synced: async () => (await api.request(r.id, session)).request.status === "finalized",
            success: `Dana diteruskan ke ${requesterName}.`,
            invalidate: [keys.request(r.id), ["requests"]],
          })
        }
      >
        {tx.busy ? phaseLabel[tx.phase] : "Teruskan sekarang"}
      </Button>
      <p className="text-[13px] leading-relaxed text-batu">
        Siapa pun boleh meneruskannya. Dananya hanya bisa pergi ke {requesterName}.
      </p>
    </>
  );
}

function Cancelled({ detail, requesterName }: { detail: Detail; requesterName: string }) {
  const config = useConfig();
  const tx = useTx();
  const { request: r, you } = detail;
  const contribution = you?.contribution;
  if (!contribution || contribution.refunded) {
    return (
      <Summary title="Dibatalkan">
        {requesterName} membatalkan permintaan ini{r.cancelledAt ? ` pada ${formatDate(r.cancelledAt)}` : ""}.
        {contribution?.refunded ? " Iuranmu sudah kembali ke dompetmu." : ""}
      </Summary>
    );
  }
  return (
    <>
      <Summary title="Dibatalkan">
        {requesterName} membatalkan permintaan ini. Iuranmu <strong className="tabular">{formatWhzd(contribution.amount)} WHZD</strong>{" "}
        bisa kamu ambil kembali.
      </Summary>
      <Button
        size="lg"
        disabled={tx.busy}
        onClick={() =>
          void tx.run({
            send: () => writeContract(config, { ...escrow, functionName: "claimRefund", args: [BigInt(r.id)] }),
            success: `${formatWhzd(contribution.amount)} WHZD sudah kembali ke dompetmu.`,
            invalidate: [keys.request(r.id), keys.refunds, ["member"]],
          })
        }
      >
        {tx.busy ? phaseLabel[tx.phase] : `Ambil kembali ${formatWhzd(contribution.amount)} WHZD`}
      </Button>
    </>
  );
}

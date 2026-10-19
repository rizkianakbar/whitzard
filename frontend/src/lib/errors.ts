import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

import { ApiError } from "@/lib/api";

// Contract custom errors (contracts/interfaces) → what the member should know or do.
const contractErrors: Record<string, string> = {
  FaucetCooldown: "Kamu sudah mengambil token hari ini. Coba lagi besok.",
  FaucetCapReached: "Kamu sudah mengambil batas maksimal token.",
  AlreadyRegistered: "Kamu sudah terdaftar.",
  NotRegistered: "Daftar dulu sebagai anggota.",
  ReadyUnchanged: "Status siap membantu sudah seperti itu.",
  NoTokenBalance: "Ambil token dulu sebelum menyalakan siap membantu.",
  NotEligible: "Kamu perlu membantu permintaan orang lain dulu sebelum mengajukan lagi.",
  InvalidProof: "Iuran yang dipakai sebagai syarat tidak berlaku lagi. Muat ulang halaman.",
  HasOpenRequest: "Kamu masih punya permintaan yang berjalan.",
  EmptySnapshot: "Belum ada anggota lain yang siap membantu.",
  ShareTooSmall: "Jumlahnya terlalu kecil untuk dibagi ke semua anggota.",
  DurationOutOfRange: "Lama pengumpulan harus antara 5 menit dan 30 hari.",
  ZeroAmount: "Isi jumlah yang dibutuhkan.",
  DeadlinePassed: "Waktu permintaan ini sudah habis.",
  DeadlineNotReached: "Waktu permintaan ini belum habis.",
  RequestNotActive: "Permintaan ini sudah tidak menerima tindakan itu.",
  RequesterCannotContribute: "Kamu tidak bisa membantu permintaanmu sendiri.",
  NotInSnapshot: "Kamu tidak termasuk anggota yang diminta membantu permintaan ini.",
  AlreadyContributed: "Kamu sudah membantu permintaan ini.",
  NotRequester: "Hanya peminta yang bisa membatalkan.",
  NothingToRefund: "Tidak ada iuran yang bisa diambil kembali.",
  ERC20InsufficientBalance: "Saldo WHZD-mu tidak cukup.",
  ERC20InsufficientAllowance: "Izin pemakaian token belum diberikan. Coba lagi.",
};

/** A short, actionable message for any error from the wallet, the chain or the API. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return "Kamu membatalkan di dompet.";
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && contractErrors[name]) return contractErrors[name];
    }
    if (/insufficient funds/i.test(error.message)) return "ETH di dompetmu tidak cukup untuk biaya transaksi.";
    return error.shortMessage;
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan. Coba lagi.";
}

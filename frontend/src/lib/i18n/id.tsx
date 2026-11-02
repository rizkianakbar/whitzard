import type { ReactNode } from "react";

/**
 * Indonesian, the source language: every key lives here first, and its shape (Dict) is what the
 * other languages must match. Entries that need numbers or styled parts are functions; parts passed
 * in as ReactNode keep their markup (bold amounts, links) in the component.
 */
export const id = {
  meta: {
    title: "Whitzard: saling bantu biaya berobat lewat smart contract",
    description: "Saling bantu biaya berobat antaranggota, dengan iuran yang sama dan tercatat untuk semua.",
    titles: {
      ask: "Ajukan bantuan",
      home: "Beranda",
      join: "Gabung",
      notifications: "Notifikasi",
      requests: "Permintaan",
      request: "Detail permintaan",
      profile: "Profil",
    },
  },

  language: {
    label: "Bahasa",
    names: { id: "Bahasa Indonesia", en: "English" },
    short: { id: "ID", en: "EN" },
  },

  common: {
    member: "Anggota",
    you: "Kamu",
    saving: "Menyimpan",
    loading: "Memuat…",
    justNow: "baru saja",
    copy: "Salin",
    copied: "Tersalin",
    testnet: "Uji coba",
    topUp: "Isi saldo",
    askForHelp: "Ajukan bantuan",
    notThisTime: "Tidak kali ini",
    seeHistory: "Lihat riwayat",
    showLess: "Tampilkan lebih sedikit",
    showAll: (n: number) => `Tampilkan semua (${n})`,
    request: (id: number) => `Permintaan #${id}`,
    help: (amount: string) => `Bantu ${amount} WHZD`,
    claimBack: (amount: string) => `Ambil kembali ${amount} WHZD`,
    refundDetail: "Iuranmu dari permintaan yang dibatalkan kembali ke dompetmu.",
    declinedToast: "Kamu tidak ikut kali ini.",
    onExplorer: "Lihat riwayat dompet di Etherscan",
  },

  errors: {
    contract: {
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
    } as Record<string, string>,
    noWallet: "Dompet tidak ditemukan di browser ini. Pasang MetaMask, lalu muat ulang halaman.",
    rejected: "Kamu membatalkan di dompet.",
    insufficientFunds: "ETH di dompetmu tidak cukup untuk biaya transaksi.",
    connectFirst: "Hubungkan dompet dulu.",
    request: (status: number) => `Permintaan gagal (${status})`,
    generic: "Terjadi kesalahan. Coba lagi.",
  },

  tx: {
    phase: { idle: "", wallet: "Setujui di dompetmu", pending: "Sedang diproses", syncing: "Hampir selesai", done: "Selesai" },
    failed: "Transaksi gagal di blockchain.",
    slowSync: "Transaksi tercatat, tapi tampilan belum diperbarui. Muat ulang sebentar lagi.",
  },

  wallet: {
    /** "Di dompet tertulis: Escrow · contribute." plus what it does, for a contract call. */
    call: (contract: string, fn: string, effect: string) => `Di dompet tertulis: ${contract} · ${fn}. ${effect}`,
    signIn: {
      title: "Masuk ke Whitzard",
      detail: "Dompet meminta tanda tangan pesan masuk. Gratis: bukan transaksi, tidak ada dana yang berpindah.",
    },
  },

  signIn: {
    button: "Masuk",
    withWallet: "Masuk dengan dompet",
    intro: "Pilih dompetmu, lalu tanda tangani pesan masuk. Gratis, dan tidak mengirim transaksi apa pun. Whitzard tidak pernah memegang kuncimu.",
    browserWallet: "Dompet di browser",
    devAccounts: "Pengembangan lokal: akun uji dari node Hardhat.",
    devAccount: (n: number) => `Akun uji ${n}`,
    noWallet: {
      title: "Belum ada dompet di browser ini",
      body: "Dompet kripto adalah aplikasi gratis yang menyimpan akunmu di Whitzard. Tidak perlu email atau kata sandi: kamu masuk dengan menyetujui pesan di dompet. Pasang sekali, sekitar 2 menit.",
      desktopLabel: "Di komputer:",
      desktop: "pasang ekstensi MetaMask, buat dompet baru, lalu muat ulang halaman ini.",
      install: "Pasang MetaMask",
      phoneLabel: "Di HP:",
      phone: (link: ReactNode) => <>pasang aplikasi MetaMask, lalu {link}.</>,
      phoneLink: "buka Whitzard di dalam aplikasinya",
      recovery: "Simpan baik-baik frasa pemulihan yang diberikan MetaMask. Whitzard tidak bisa memulihkan dompetmu.",
    },
  },

  shell: {
    nav: { home: "Beranda", requests: "Permintaan", ask: "Ajukan" },
    navLabel: "Utama",
    balance: (amount: string) => `Saldo ${amount} WHZD. Isi saldo`,
    notifications: "Notifikasi",
    unread: (n: number) => `Notifikasi, ${n} belum dibaca`,
    markAllRead: "Tandai semua dibaca",
    bellEmpty: "Belum ada notifikasi. Kamu diberi tahu saat ada yang butuh bantuan, saat iuran masuk, dan saat dana diteruskan.",
    seeAll: "Lihat semua notifikasi",
    account: "Akun",
    profile: "Profil",
    signOut: "Keluar",
    wrongNetwork: (chain: string) => `Dompetmu terhubung ke jaringan lain. Whitzard berjalan di ${chain}.`,
    switchTo: (chain: string) => `Pindah ke ${chain}`,
  },

  notifications: {
    title: "Notifikasi",
    markAllRead: "Tandai semua sudah dibaca",
    unread: "Belum dibaca",
    empty: "Belum ada notifikasi. Kamu akan diberi tahu saat ada anggota yang butuh bantuan, saat iuran masuk, dan saat dana diteruskan.",
    types: {
      request_opened: {
        title: "Ada yang butuh bantuan",
        body: (id: number, amount: string) => `Permintaan nomor ${id} meminta ${amount} WHZD dari setiap anggota.`,
      },
      contribution_received: {
        title: "Iuran baru masuk",
        body: (id: number, amount: string) => `Seorang anggota membantu ${amount} WHZD untuk permintaanmu nomor ${id}.`,
      },
      request_cancelled: {
        title: "Permintaan dibatalkan",
        body: (id: number) => `Permintaan nomor ${id} dibatalkan oleh peminta. Kamu bisa mengambil iuranmu kembali.`,
      },
      request_expired: {
        title: "Permintaan berakhir",
        body: (id: number) => `Waktu permintaan nomor ${id} habis tanpa iuran.`,
      },
      request_finalized: {
        title: "Dana sudah diterima",
        body: (id: number, amount: string) => `${amount} WHZD dari permintaan nomor ${id} sudah masuk ke dompetmu.`,
      },
      request_forwarded: {
        title: "Dana sudah diteruskan",
        body: (id: number, amount: string) => `Permintaan nomor ${id} yang kamu bantu sudah selesai: ${amount} WHZD sampai ke peminta.`,
      },
    },
  },

  countdown: {
    /** Two largest units: "2 hari 4 jam", "3 jam 12 menit". */
    short: (days: number, hours: number, minutes: number) =>
      days > 0
        ? hours > 0
          ? `${days} hari ${hours} jam`
          : `${days} hari`
        : minutes > 0
          ? `${hours} jam ${minutes} menit`
          : `${hours} jam`,
    left: (time: ReactNode) => <>{time} <span className="font-medium">lagi</span></>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    unit: { day: (_: number) => "hari", hour: (_: number) => "jam", minute: (_: number) => "menit", second: (_: number) => "detik" },
    closesIn: "Ditutup dalam",
    closesInAria: (time: string) => `Ditutup dalam ${time}`,
  },

  funding: {
    collected: "Terkumpul",
    ofAmount: (amount: string, standalone: boolean) => `dari ${amount} WHZD${standalone ? " terkumpul" : ""}`,
    aria: "Dana terkumpul",
    helped: (count: ReactNode, size: ReactNode) => <>{count} dari {size} anggota sudah membantu</>,
  },

  status: {
    open: "Terbuka",
    funding: "Mengumpulkan",
    awaiting: "Sedang dikirim",
    finalized: "Terkirim",
    expired: "Berakhir",
    cancelled: "Dibatalkan",
    youHelped: (amount: string) => `Kamu membantu ${amount} WHZD`,
    youDeclined: "Kamu tidak ikut",
  },

  outcome: {
    finalized: (amount: ReactNode, mine: boolean, members: number) => (
      <>
        {amount} {mine ? "diterima" : "terkirim"} dari {members} anggota
      </>
    ),
    cancelledMine: "Kamu membatalkannya",
    cancelled: "Dibatalkan oleh peminta",
    awaiting: "Waktu habis, dana sedang dikirim",
    expired: "Berakhir tanpa iuran",
  },

  txProof: {
    label: "Bukti transaksi",
    open: (hash: string) => `Buka ${hash} di Etherscan`,
  },

  shareGrid: {
    aria: (contributed: number, size: number, declined: number, you: boolean) =>
      `${contributed} dari ${size} anggota sudah membantu` +
      (declined ? `, ${declined} tidak ikut` : "") +
      (you ? ", kotakmu bergaris tebal" : ""),
    helped: "Sudah membantu",
    you: "Kamu",
    declined: "Tidak ikut",
    noAnswer: "Belum menjawab",
  },

  carousel: {
    previous: "Sebelumnya",
    next: "Berikutnya",
    item: (i: number, count: number) => `Permintaan ${i} dari ${count}`,
  },

  landing: {
    footer: "MVP yang sudah berjalan: escrow otomatis untuk penyaluran bantuan kesehatan antaranggota.",
    navLabel: "Halaman ini",
    nav: { how: "Cara kerja", compare: "Bedanya", join: "Cara bergabung", faq: "Tanya jawab" },
    hero: {
      title: "Biaya berobat terasa ringan kalau ditanggung bersama.",
      body: "Saat ada anggota yang sakit, setiap anggota lain menyumbang bagian yang sama. Iurannya disimpan di smart contract dan diteruskan otomatis saat waktunya habis. Tidak ada admin dan tidak ada voting.",
      seeHow: "Lihat cara kerjanya",
    },
    demo: {
      name: "Sari, Bandung",
      need: "Rawat inap demam berdarah",
      forwarded: "Diteruskan",
      gridAria: "Contoh kotak iuran: satu kotak satu anggota",
      chip: (amount: number) => `Ikut membantu ${amount} WHZD`,
      sent: "diteruskan ke Sari, tanpa persetujuan siapa pun",
      collectedOf: (total: number) => `terkumpul dari ${total} WHZD`,
      perMember: "per anggota",
      replay: "Ulangi contoh",
      hint: "Contoh. Ketuk kotak kosong untuk ikut membantu.",
    },
    /** Short promises for the scrolling band under the hero. */
    marquee: [
      "Tanpa admin",
      "Tanpa voting",
      "Bagian sama rata",
      "Dana di smart contract",
      "Bisa dicek siapa saja",
      "Uang kembali kalau batal",
      "Bukan asuransi",
      "MVP di jaringan uji",
    ],
    newWay: {
      title: "Cara baru saling bantu biaya berobat",
      intro:
        "JKN sudah menjangkau sebagian besar warga, tapi biaya berobat belum sepenuhnya tertanggung. Whitzard menghidupkan kebiasaan lama, saling bantu antaranggota, dengan aturan yang dijalankan smart contract.",
      figures: [
        { value: "80%+", label: "penduduk Indonesia sudah terdaftar JKN" },
        { value: "30%+", label: "belanja kesehatan masih dibayar dari kantong sendiri" },
      ],
      source: "Sumber: Fattah dkk. (2023); Maulana dkk. (2022).",
      cards: [
        {
          title: "Bukan asuransi",
          body: "Tidak ada premi bulanan dan tidak ada polis. Iuran baru dikumpulkan setelah ada anggota yang mengajukan bantuan.",
        },
        {
          title: "Sukarela, bagiannya sama",
          body: "Sebelum memutuskan, kamu melihat ceritanya, tagihannya, dan bagianmu, yang sama untuk semua. Boleh membantu, boleh tidak.",
        },
        {
          title: "Tanpa admin, tanpa voting",
          body: "Tidak ada yang menyetujui pencairan dan tidak ada potongan biaya pengelola. Saat waktunya habis, kontrak mengirim dananya.",
        },
        {
          title: "Gantian, seperti arisan",
          body: "Hak mengajukan didapat dengan membantu. Setelah permintaan pertamamu, bantu satu anggota lain dulu sebelum mengajukan lagi.",
        },
      ],
    },
    compare: {
      title: "Apa bedanya?",
      intro: "Saling bantu bukan hal baru. Yang baru: tidak ada orang di tengah yang memegang uangnya.",
      aspect: "Aspek",
      columns: ["Whitzard", "Patungan lewat bendahara", "Platform saling bantu terpusat"],
      rows: [
        { label: "Siapa memegang dana", values: ["Smart contract, bukan orang", "Bendahara atau pengelola", "Rekening yayasan atau platform"] },
        { label: "Siapa memutuskan pencairan", values: ["Tidak ada: otomatis saat waktu habis", "Pengelola", "Tim verifikasi platform"] },
        { label: "Cara iuran", values: ["Sukarela, kamu pilih di setiap permintaan", "Sesuai kesepakatan kelompok", "Umumnya dipotong otomatis dari saldo"] },
        { label: "Biaya pengelola", values: ["Tidak ada, hanya biaya jaringan", "Tergantung kelompok", "Umumnya ada, berupa persentase"] },
        { label: "Kalau dibatalkan", values: ["Iuran bisa diambil kembali", "Tergantung kesepakatan", "Tergantung kebijakan platform"] },
        { label: "Siapa bisa memeriksa", values: ["Siapa saja, langsung di blockchain", "Bergantung catatan pengelola", "Laporan dari platform"] },
      ],
      scrollHint: "Geser untuk melihat semua kolom",
      note: "Kolom pembanding menggambarkan cara kerja yang umum, bukan layanan tertentu.",
    },
    how: {
      title: "Cara kerja",
      intro: "Empat langkah, dan setelah permintaan dibuat tidak ada orang yang perlu menyetujui apa pun.",
      steps: [
        { title: "Ajukan", body: "Anggota yang butuh biaya berobat menulis ceritanya, jumlah yang dibutuhkan, dan melampirkan tagihan." },
        { title: "Dibagi rata", body: "Jumlahnya dibagi rata ke semua anggota yang sedang siap membantu. Setiap orang diminta bagian yang sama." },
        { title: "Disimpan di escrow", body: "Iuran masuk ke smart contract, bukan ke rekening siapa pun. Tidak ada yang bisa memindahkannya ke tempat lain." },
        { title: "Diteruskan otomatis", body: "Saat waktunya habis, semua yang terkumpul dikirim ke peminta. Kalau dibatalkan, iuran kembali ke pemberinya." },
      ],
    },
    transparency: {
      title: "Tidak ada orang yang memegang uangnya.",
      points: (chain: string) => [
        { lead: "Tanpa admin.", body: "Aturannya ditulis di smart contract dan berjalan sendiri. Tidak ada yang bisa menahan atau mengalihkan dana." },
        { lead: "Tercatat untuk semua.", body: `Setiap iuran dan pencairan adalah transaksi publik di ${chain} yang bisa dicek siapa saja.` },
        { lead: "Uang kembali kalau batal.", body: "Kalau peminta membatalkan, setiap anggota bisa mengambil kembali iurannya." },
      ],
      figures: {
        members: "anggota terdaftar",
        ready: "sedang siap membantu",
        funded: "permintaan sudah tersalurkan",
        distributed: "WHZD diteruskan ke peminta",
      },
      contracts: {
        escrow: "menyimpan dan meneruskan iuran",
        registry: "daftar anggota dan status siap membantu",
        token: "token uji untuk iuran",
        tokenName: "Token WHZD",
      },
      check: "Periksa sendiri",
      onExplorer: (address: string) => `${address} di Etherscan`,
    },
    join: {
      title: "Cara bergabung",
      body: (chain: string) =>
        `Whitzard adalah MVP yang sudah selesai, dibuat untuk membuktikan idenya berjalan dari awal sampai akhir. Whitzard berjalan di ${chain}, jaringan uji Ethereum, dengan token WHZD yang tidak bernilai uang, jadi kamu bisa mencoba seluruh alurnya tanpa mengeluarkan uang sungguhan.`,
      time: "Sekitar lima menit.",
      steps: (chain: string): { title: string; body: string; link?: string }[] => [
        {
          title: "Pasang dompet",
          body: `MetaMask atau dompet lain yang mendukung ${chain}. Gratis, dan menjadi akunmu di Whitzard.`,
          link: "Pasang MetaMask",
        },
        { title: "Ambil ETH uji", body: `Sedikit ETH ${chain} untuk biaya jaringan, gratis dari faucet Google.`, link: "Buka faucet" },
        { title: "Masuk dan daftar", body: "Masuk dengan dompetmu, daftar sebagai anggota, lalu isi profil singkat." },
        {
          title: "Isi saldo dan siap membantu",
          body: "Ambil 100 WHZD gratis, lalu nyalakan siap membantu supaya ikut dihitung saat ada permintaan.",
        },
      ],
    },
    faq: {
      title: "Tanya jawab",
      items: [
        {
          q: "Apakah Whitzard asuransi?",
          a: "Bukan. Tidak ada premi, polis, atau janji pertanggungan. Iuran dikumpulkan setelah ada permintaan, dan setiap anggota bebas memilih membantu atau tidak.",
        },
        {
          q: "Apakah Whitzard layanan sungguhan?",
          a: "Bukan. Whitzard adalah MVP yang sudah selesai: bukti nyata bahwa bantuan kesehatan antaranggota bisa dikumpulkan dan disalurkan oleh smart contract, tanpa admin di tengah. Whitzard berjalan di Sepolia, jaringan uji Ethereum, jadi setiap langkahnya (bergabung, meminta, iuran, penyaluran, dan pengembalian dana) benar-benar berjalan, tetapi tanpa uang sungguhan. Tidak ada rencana membawanya ke mainnet atau memakai uang sungguhan. Itu akan membawa urusan hukum (mekanisme seperti ini bisa menyerupai asuransi), pemeriksaan tagihan medis di dunia nyata, dan audit keamanan, yang semuanya di luar cakupan proyek ini.",
        },
        {
          q: "Apakah saya perlu membayar untuk mencoba?",
          a: "Tidak. WHZD adalah token uji yang tidak bernilai uang: tidak bisa dibeli maupun dicairkan. Kamu mengambilnya dari faucet bawaan, dan biaya jaringan dibayar dengan ETH uji Sepolia yang gratis. Mencoba Whitzard tidak memakan biaya apa pun.",
        },
        {
          q: "Siapa yang memutuskan dana dicairkan?",
          a: "Tidak ada. Saat waktu pengumpulan habis, smart contract meneruskan semua yang terkumpul ke peminta, berapa pun jumlahnya. Tidak ada persetujuan atau voting.",
        },
        {
          q: "Siapa yang bisa melihat cerita dan tagihanku?",
          a: "Cerita permintaan hanya terlihat oleh anggota yang sudah masuk. Dokumen tagihan hanya bisa dibuka olehmu dan anggota yang diminta membantu, dan diperiksa dengan sidiknya di blockchain supaya tidak bisa diubah diam-diam.",
        },
        {
          q: "Kenapa saya harus membantu dulu sebelum mengajukan lagi?",
          a: "Permintaan pertama boleh langsung. Setelah itu, kamu perlu membantu satu permintaan anggota lain sebelum mengajukan lagi, supaya semua orang ikut menanggung.",
        },
        {
          q: "Bagaimana kalau dananya tidak terkumpul penuh?",
          a: "Yang terkumpul tetap diteruskan. Kalau tidak ada iuran sama sekali, permintaan berakhir tanpa pencairan.",
        },
        {
          q: "Siapa yang memeriksa kebenaran tagihan?",
          a: "Tidak ada pemeriksa. Kamu sendiri yang menilai cerita dan tagihannya sebelum membantu. Sidik dokumen di blockchain menjamin tagihannya tidak diganti setelah permintaan dibuat, dan karena bagian setiap anggota sama, permintaan yang berlebihan langsung terlihat sebagai bagian yang besar.",
        },
        {
          q: "Apa itu dompet kripto, dan apakah aman?",
          a: "Dompet kripto, misalnya MetaMask, adalah aplikasi yang menyimpan kunci akunmu. Whitzard tidak pernah memegang kunci itu: setiap transaksi harus kamu setujui sendiri di dompet. Simpan frasa pemulihannya baik-baik, karena siapa pun yang memegangnya bisa memakai dompetmu.",
        },
      ],
    },
  },

  dashboard: {
    greeting: { morning: "Selamat pagi", noon: "Selamat siang", afternoon: "Selamat sore", evening: "Selamat malam" },
    setup: {
      title: "Selesaikan pendaftaranmu",
      body: (needsProfile: boolean) =>
        `${needsProfile ? "Isi profil" : "Isi saldo"} supaya kamu bisa mulai membantu dan mengajukan bantuan.`,
    },
    wallet: {
      label: "Saldo",
      testToken: "Token uji, tidak bernilai uang",
      given: "Kamu berikan",
      givenNote: (times: number) => `${times} kali membantu`,
      received: "Kamu terima",
      receivedNote: (funded: number) => `${funded} permintaan tersalurkan`,
      neverAsked: "Belum pernah mengajukan",
    },
    ready: {
      label: "Siap membantu",
      on: "Kamu ikut dihitung saat ada permintaan baru.",
      off: "Kamu tidak dihitung di permintaan baru.",
      empty: "Isi saldo dulu sebelum menyalakan.",
      promptOn: "Nyalakan siap membantu",
      promptOff: "Matikan siap membantu",
      detailOn: "Kamu ikut dihitung di permintaan baru. Tidak ada dana yang berpindah.",
      detailOff: "Kamu tidak dihitung di permintaan baru. Tidak ada dana yang berpindah.",
      successOn: "Kamu siap membantu.",
      successOff: "Kamu tidak dihitung di permintaan baru.",
    },
    canRequest: {
      title: "Mengajukan bantuan",
      checking: "Memeriksa…",
      can: { title: "Kamu bisa mengajukan bantuan", text: "Saat butuh biaya berobat, ajukan kapan saja.", cta: "Ajukan" },
      running: { title: "Permintaanmu masih berjalan", text: "Bisa mengajukan lagi setelah waktunya habis.", cta: "Lihat" },
      helpFirst: { title: "Belum bisa mengajukan", text: "Bantu satu permintaan anggota lain dulu.", cta: "Cari" },
    },
    refund: {
      body: (request: ReactNode, amount: ReactNode) => (
        <>
          {request} dibatalkan. Iuranmu {amount} bisa kamu ambil kembali.
        </>
      ),
      success: (amount: string) => `${amount} WHZD sudah kembali ke saldomu.`,
    },
    waiting: {
      title: "Membantu anggota lain",
      description: "Permintaan anggota lain yang meminta bagianmu.",
      count: (n: number) => `${n} menunggu jawabanmu`,
      allAnswered: "Semua sudah kamu jawab",
      emptyTitle: "Belum ada yang meminta bantuanmu",
      emptyBody: "Saat ada anggota yang butuh dan siap membantu menyala, permintaannya muncul di sini.",
      carousel: "Permintaan anggota lain",
    },
    card: {
      sendingToYou: "Dana sedang dikirim ke dompetmu.",
      autoToYou: "Dikirim otomatis ke dompetmu saat waktu habis.",
      sendingTo: (name: string) => `Dana sedang dikirim ke ${name}`,
      canStillHelp: "Masih bisa membantu sampai waktunya habis.",
    },
    declined: {
      description: "Permintaannya tetap di sini, dan masih bisa kamu bantu sampai waktunya habis.",
    },
    mine: {
      title: "Bantuan untukmu",
      description: "Bantuan yang kamu ajukan untuk dirimu.",
      history: "Riwayat pengajuan",
      noneRunning: "Tidak ada pengajuan yang berjalan",
      never: "Belum pernah mengajukan",
      emptyBody: "Saat butuh biaya berobat, ajukan di sini. Anggota yang siap membantu langsung diberi tahu.",
    },
  },

  members: {
    title: "Anggota",
    summary: (total: number, ready: number) => `${total} anggota, ${ready} sedang siap membantu.`,
    you: " (kamu)",
    ready: "Siap membantu",
    notReady: "Sedang tidak siap",
  },

  requests: {
    title: "Permintaan",
    waitingYou: (n: ReactNode) => <>{n} permintaan menunggu jawabanmu.</>,
    running: (n: ReactNode) => <>{n} permintaan sedang berjalan.</>,
    noneRunning: "Tidak ada permintaan yang sedang berjalan.",
    scopes: { all: "Semua", "for-me": "Untukku", mine: "Milikku" },
    states: { all: "Semua", live: "Berjalan", done: "Selesai" },
    scopeLabel: "Tampilkan",
    stateLabel: "Status",
    search: "Cari permintaan",
    searchPlaceholder: "Cari judul atau cerita",
    clearSearch: "Hapus pencarian",
    empty: {
      query: (q: string) => `Tidak ada permintaan yang cocok dengan "${q}".`,
      live: "Tidak ada permintaan yang sedang berjalan.",
      done: "Belum ada permintaan yang selesai.",
      mine: "Kamu belum pernah mengajukan bantuan.",
      forMe: "Belum ada permintaan yang ditujukan kepadamu. Nyalakan siap membantu di beranda supaya ikut dihitung.",
      all: "Belum ada permintaan.",
    },
    sections: { forYou: "Menunggu jawabanmu", running: "Sedang berjalan", past: "Sudah selesai" },
    share: (amount: ReactNode) => <>Bagian {amount}</>,
  },

  request: {
    notFound: "Permintaan tidak ditemukan",
    notFoundYet: "Mungkin baru saja dibuat dan belum tercatat. Coba muat ulang sebentar lagi.",
    all: "Semua permintaan",
    back: "Permintaan",
    collected: "Dana terkumpul",
    gridNote: (share: string, size: number, name: string) =>
      `Setiap kotak satu anggota, semuanya bernilai sama: ${share} WHZD. Anggota dihitung saat permintaan dibuat, yaitu ${size} orang yang sedang siap membantu, tidak termasuk ${name}.`,
    story: (name: string) => `Cerita ${name}`,
    actions: "Tindakan",
    evidence: {
      title: "Bukti",
      allowed: (name: string) => `Hanya ${name} dan anggota yang diminta membantu yang bisa membukanya.`,
      restricted: (name: string) => `Hanya untuk ${name} dan anggota yang diminta membantu.`,
      document: "Tagihan atau surat dokter",
      unavailable: "Dokumen tidak tersedia",
      match: "Asli: cocok dengan sidik di blockchain",
      mismatch: "Tidak cocok dengan sidik di blockchain: dokumen ini sudah diubah",
      fingerprint: (hash: string) => `Sidik di blockchain ${hash}`,
      checking: "Memeriksa",
      check: "Periksa dokumen",
      open: "Lihat dokumen",
      note: "Sidik (SHA-256) dokumen dicatat di blockchain saat permintaan dibuat. Sebelum dibuka, dokumen diperiksa dengan sidik itu, jadi kamu tahu dokumennya tidak diganti.",
    },
    discussion: {
      title: "Diskusi",
      description: "Ruang tanya jawab antaranggota tentang permintaan ini.",
      placeholder: "Tulis komentar atau pertanyaan…",
      send: "Kirim komentar",
      sending: "Mengirim komentar",
      empty: "Belum ada komentar. Pertanyaan tentang permintaan ini bisa ditulis di sini.",
      posted: "Komentar terkirim.",
      shortcut: "Ctrl/⌘ + Enter untuk mengirim",
      requester: "Peminta",
    },
    history: {
      title: "Riwayat",
      description: (chain: string, explorer: boolean) =>
        `Tercatat permanen di ${chain}${explorer ? ". Tekan kodenya untuk memeriksa di Etherscan" : ""}.`,
      opened: (amount: ReactNode) => <>meminta {amount}</>,
      helped: (amount: ReactNode) => <>membantu {amount}</>,
      refunded: (amount: ReactNode) => <>mengambil kembali {amount}</>,
      cancelled: "membatalkan",
      finalized: (amount: ReactNode, name: string) => <>{amount} diteruskan ke {name}</>,
      expired: "Berakhir tanpa iuran",
      more: (n: number) => `Tampilkan ${n} langkah lainnya`,
      heldBy: (contract: ReactNode) => <>Dana ditahan kontrak {contract}, bukan oleh siapa pun.</>,
    },
    finalized: {
      title: "Dana sudah terkirim",
      body: (amount: ReactNode, name: string, when: string | null) => (
        <>
          {amount} sampai ke {name}
          {when ? ` pada ${when}` : ""}, langsung dari kontrak tanpa perantara.
        </>
      ),
      proof: "Bukti transfer",
    },
    expired: { title: "Berakhir", body: "Waktu pengumpulan habis tanpa iuran, jadi tidak ada dana yang diteruskan." },
    notIncluded: {
      title: "Kamu tidak termasuk di permintaan ini",
      body: "Permintaan ini hanya ditujukan ke anggota yang sedang siap membantu saat permintaan dibuat.",
    },
    contributed: {
      title: "Iuranmu sudah tercatat",
      body: (amount: ReactNode, name: string) => (
        <>
          Terima kasih. {amount} ikut diteruskan ke {name} saat waktu habis.
        </>
      ),
    },
    contribute: {
      prompt: (amount: string) => `Kirim iuran ${amount} WHZD`,
      promptStep2: (amount: string) => `Kirim iuran ${amount} WHZD (2 dari 2)`,
      detail: (name: string) => `Dana ditahan kontrak dan diteruskan ke ${name} saat waktu habis.`,
      permit: (amount: string) => `Izinkan ${amount} WHZD untuk iuran (1 dari 2)`,
      permitDetail: (amount: string) =>
        `Dompet meminta tanda tangan "Permit": izin bagi kontrak Escrow memakai ${amount} WHZD. Gratis, belum ada dana yang berpindah.`,
      success: (amount: string) => `Iuranmu ${amount} WHZD tercatat. Terima kasih.`,
      declinedTitle: "Kamu tidak ikut kali ini",
      declinedBody: (amount: ReactNode) => (
        <>
          Tidak apa-apa, membantu selalu pilihanmu. Kalau berubah pikiran, kamu masih bisa membantu {amount} sampai waktunya
          habis.
        </>
      ),
      yourShare: "Bagianmu",
      sameForAll: (amount: string, members: number) => `Sama untuk semua: ${amount} WHZD dibagi ${members} anggota.`,
      notEnough: (balance: string) => `Saldomu ${balance} WHZD, kurang dari bagianmu.`,
      note: (name: string) =>
        `Dana disimpan di kontrak dan diteruskan ke ${name} saat waktu habis, berapa pun yang terkumpul. Kalau permintaan dibatalkan, kamu bisa mengambilnya kembali.`,
    },
    requester: {
      title: "Permintaanmu sedang berjalan",
      body: (amount: ReactNode, members: number) => (
        <>
          {amount} sudah terkumpul untukmu dari {members} anggota.
        </>
      ),
      note: "Saat waktu habis, semua yang terkumpul diteruskan ke dompetmu secara otomatis, berapa pun jumlahnya.",
      cancel: "Batalkan permintaan",
      cancelDetail: "Tidak ada dana yang diteruskan kepadamu; setiap anggota bisa mengambil iurannya kembali.",
      cancelSuccess: "Permintaan dibatalkan. Anggota bisa mengambil iurannya kembali.",
      confirmTitle: "Batalkan permintaan ini?",
      confirmBody: "Tidak ada dana yang diteruskan kepadamu. Setiap anggota bisa mengambil kembali iurannya. Pembatalan tidak bisa diurungkan.",
      back: "Kembali",
    },
    awaiting: {
      yourWallet: "dompetmu",
      alreadySent: "Dananya sudah terkirim otomatis.",
      close: "Tutup permintaan",
      send: (amount: string, to: string) => `Kirim ${amount} WHZD ke ${to}`,
      sendDetail: (name: string) => `Kontrak hanya bisa mengirim ke ${name}; kamu hanya membayar biaya jaringan.`,
      closed: "Permintaan ditutup.",
      sent: (to: string) => `Dana terkirim ke ${to}.`,
      steps: {
        ended: "Waktu pengumpulan habis",
        closing: "Menutup permintaan",
        sending: (amount: string) => `Mengirim ${amount} WHZD otomatis`,
        done: "Selesai",
        received: (to: string) => `Diterima ${to}`,
      },
      titleEmpty: "Waktu habis",
      title: "Waktu habis, dana segera dikirim",
      bodyEmpty: "Tidak ada iuran yang masuk, jadi tidak ada dana yang dikirim. Permintaan ini ditutup otomatis.",
      body: (amount: ReactNode, to: string) => (
        <>
          Tinggal tunggu sebentar. {amount} dikirim otomatis ke {to}, tidak perlu menekan apa pun. Halaman ini berubah sendiri
          begitu dananya sampai.
        </>
      ),
      process: "Proses",
      overdue: (name: string) =>
        `Pengirimannya lebih lama dari biasanya. Kalau tidak mau menunggu, kamu bisa mengirimnya sendiri. Dananya tetap hanya bisa sampai ke ${name}, dan tidak mungkin terkirim dua kali.`,
      sendNow: "Kirim sekarang",
    },
    cancelled: {
      title: "Dibatalkan",
      body: (name: string, when: string | null, refunded: boolean) =>
        `${name} membatalkan permintaan ini${when ? ` pada ${when}` : ""}.${refunded ? " Iuranmu sudah kembali ke dompetmu." : ""}`,
      claimable: (name: string, amount: ReactNode) => (
        <>
          {name} membatalkan permintaan ini. Iuranmu {amount} bisa kamu ambil kembali.
        </>
      ),
      success: (amount: string) => `${amount} WHZD sudah kembali ke dompetmu.`,
    },
  },

  ask: {
    title: "Ajukan bantuan",
    intro: "Ceritakan kebutuhanmu dan lampirkan tagihan. Anggota yang sedang siap membantu akan diberi tahu, dan masing-masing diminta bagian yang sama.",
    blocked: {
      register: { title: "Daftar dulu sebagai anggota", cta: "Daftar sekarang", body: "Hanya anggota yang bisa mengajukan bantuan. Pendaftaran cukup sekali." },
      running: {
        title: "Permintaanmu masih berjalan",
        cta: "Lihat permintaanmu",
        body: "Satu anggota hanya bisa punya satu permintaan berjalan. Kamu bisa mengajukan lagi setelah waktunya habis.",
      },
      helpFirst: {
        title: "Bantu satu anggota dulu",
        cta: "Cari permintaan untuk dibantu",
        body: "Setelah permintaan pertamamu, kamu perlu membantu satu permintaan anggota lain sebelum mengajukan lagi. Begitu iuranmu tercatat, kamu bisa langsung mengajukan.",
      },
    },
    duration: { minutes: (n: number) => `${n} menit`, days: (n: number) => `${n} hari` },
    errors: {
      title: "Isi judul permintaan.",
      titleLong: "Judul paling banyak 120 karakter.",
      description: "Ceritakan untuk apa dana ini.",
      noMembers: "Belum ada anggota lain yang siap membantu.",
      amount: "Isi jumlah dalam WHZD, misalnya 300.",
      file: "Lampirkan tagihan atau surat dokter.",
      fileLarge: "Dokumen lebih dari 10 MB.",
    },
    prompt: (amount: string) => `Ajukan ${amount} WHZD`,
    promptDetail: "Mencatat permintaanmu dan sidik dokumennya. Tidak ada dana yang berpindah sekarang.",
    success: "Permintaanmu sudah dikirim ke anggota yang siap membantu.",
    uploading: "Mengunggah dokumen",
    fields: {
      title: "Judul",
      story: "Ceritamu",
      storyHint: "Apa yang terjadi, dan untuk apa dana ini. Tidak perlu menyebut diagnosis lengkap.",
      amount: "Jumlah yang dibutuhkan",
      duration: "Lama pengumpulan",
      file: "Dokumen bukti",
      filePick: "Pilih tagihan atau surat dokter",
      fileHint: "PDF atau foto, maksimal 10 MB. Hanya anggota yang diminta membantu yang bisa melihatnya.",
    },
    submit: "Ajukan permintaan",
    submitNote: "Dokumen diunggah dulu, lalu kamu menandatangani satu transaksi di dompet. Setelah dikirim, jumlah dan bukti tidak bisa diubah.",
    preview: {
      label: "Pratinjau bagian",
      title: "Yang akan diminta ke anggota",
      fillAmount: "Isi jumlah",
      counting: "Menghitung anggota yang siap membantu",
      perMember: (members: number) => `per anggota, dari ${members} anggota yang siap membantu saat ini`,
      noMembers: "Belum ada anggota lain yang siap membantu",
      points: [
        "Dana diteruskan kepadamu saat waktu habis, berapa pun yang terkumpul.",
        "Kamu bisa membatalkan sebelum waktu habis. Iuran dikembalikan ke anggota.",
        "Jumlah anggota dikunci saat kamu mengirim, jadi bagian di atas bisa sedikit berubah.",
      ],
      others: "Lihat permintaan lain",
    },
  },

  topUp: {
    capped: "Kamu sudah mengambil batas 1.000 WHZD untuk dompet ini.",
    nextClaim: (when: string) => `Bisa ambil lagi ${when}.`,
    prompt: "Isi 100 WHZD",
    promptDetail: "Token uji gratis masuk ke dompetmu; kamu hanya membayar biaya jaringan.",
    success: "100 WHZD masuk ke saldomu.",
    noticeTitle: "Ini demo MVP",
    notice: (chain: string) =>
      `Whitzard adalah MVP yang berjalan di jaringan uji ${chain}, bukan layanan sungguhan. WHZD di sini tidak bernilai uang, tidak bisa dibeli, dan tidak bisa dicairkan. Kamu tidak perlu membayar apa pun.`,
    current: (amount: ReactNode) => <>Saldomu sekarang {amount}.</>,
    faucet: "Gratis dari faucet uji coba. Sekali setiap 24 jam, paling banyak 1.000 WHZD per dompet.",
    claim: "Ambil 100 WHZD gratis",
    eth: (chain: string, link: ReactNode) => (
      <>
        Setiap transaksi butuh sedikit ETH {chain} untuk biaya jaringan, juga gratis. Kalau dompetmu kosong, {link}.
      </>
    ),
    ethLink: "ambil ETH uji di sini",
  },

  onboarding: {
    title: "Gabung di Whitzard",
    intro: "Empat langkah singkat. Kamu bisa berhenti dan lanjut kapan saja.",
    steps: {
      join: { title: "Daftar jadi anggota", hint: "Sekali saja, tercatat di blockchain" },
      profile: { title: "Isi profil", hint: "Supaya sesama anggota mengenalmu" },
      balance: { title: "Isi saldo", hint: "100 WHZD gratis untuk uji coba" },
      ready: { title: "Siap membantu", hint: "Ikut dihitung saat ada permintaan" },
    },
    done: " (selesai)",
    progress: (step: number, total: number) => `Langkah ${step} dari ${total}`,
    join: {
      body: "Alamat dompetmu dicatat di daftar anggota Whitzard di blockchain. Cukup sekali, dan dari situ kamu bisa membantu anggota lain dan mengajukan bantuan.",
      prompt: "Daftar sebagai anggota",
      promptDetail: "Mencatat dompetmu sebagai anggota. Tidak ada dana yang berpindah.",
      success: "Kamu sudah terdaftar sebagai anggota.",
      cta: "Daftar sekarang",
    },
    eth: {
      title: (chain: string) => `Dompetmu belum punya ETH ${chain}`,
      body: "Setiap transaksi, termasuk mendaftar, butuh sedikit ETH uji untuk biaya jaringan. Ambil gratis dari faucet Google dulu, lalu kembali ke sini.",
      copy: "Salin alamat dompetmu.",
      paste: (chain: string) => `Buka faucet, pilih jaringan ${chain}, tempel alamatnya, lalu kirim.`,
      open: "Buka faucet ETH Google",
      waiting: "Menunggu ETH masuk. Tombol daftar aktif sendiri begitu ETH-nya sampai.",
    },
    profile: {
      title: "Kenalkan dirimu",
      body: "Supaya anggota lain tahu siapa yang mereka bantu, dan siapa yang membantu mereka.",
      save: "Simpan dan lanjut",
    },
    balance: {
      body: "Iuran dibayar dengan token WHZD. Ambil 100 WHZD gratis dari faucet uji coba untuk mulai.",
      current: "Saldomu sekarang",
      later: "Kamu bisa mengambil lagi setiap 24 jam lewat tombol saldo di atas, sampai 1.000 WHZD.",
    },
    ready: {
      title: "Nyalakan siap membantu",
      body: "Saat siap membantu menyala, kamu ikut dihitung setiap kali ada anggota yang mengajukan bantuan, dan kamu diberi tahu berapa bagianmu.",
      free: "Kamu tetap bebas memilih membantu atau tidak di setiap permintaan, dan bisa mematikannya kapan saja di beranda.",
      cta: "Nyalakan",
      later: "Nanti saja",
    },
    welcome: {
      title: "Selamat datang, kamu sudah jadi anggota.",
      ready: "Saat ada anggota yang butuh bantuan, permintaannya muncul di beranda dan kamu mendapat notifikasi.",
      notReady: "Nyalakan siap membantu di beranda saat kamu sudah siap ikut dihitung.",
      cta: "Ke beranda",
    },
    txNote: "Dompetmu akan meminta konfirmasi transaksi. Biayanya dibayar dengan ETH uji, bukan uang sungguhan.",
  },

  profile: {
    helped: "kali membantu",
    requests: "permintaan",
    address: "Alamat dompet",
    copyAddress: "Salin alamat",
    since: "Anggota sejak",
    edit: "Ubah profil",
    save: "Simpan profil",
    form: {
      photoTooLarge: "Foto lebih dari 2 MB.",
      nameRequired: "Isi nama lengkapmu.",
      emailRequired: "Isi emailmu.",
      emailInvalid: "Format email tidak valid.",
      birthFuture: "Tanggal lahir tidak boleh di masa depan.",
      saved: "Profil tersimpan.",
      photoRemoved: "Foto dihapus.",
      pickPhoto: "Pilih foto profil",
      photo: "Foto profil",
      photoHint: "Opsional. PNG, JPG atau WebP, maksimal 2 MB. Hanya anggota yang sudah masuk yang bisa melihatnya.",
      photoPending: (button: string) => `Foto baru tersimpan setelah kamu menekan “${button}”.`,
      cancel: "Batal",
      removePhoto: "Hapus foto",
      displayName: "Nama lengkap",
      nickname: "Nama panggilan",
      nicknameHint: "Dipakai untuk menyapamu.",
      email: "Email",
      emailHint: "Untuk menerima notifikasi lewat email.",
      city: "Kota atau kabupaten",
      cityHint: "Terlihat oleh anggota lain.",
      birthDate: "Tanggal lahir",
      birthDateHint: "Hanya terlihat olehmu.",
      note: "Whitzard tidak memeriksa data ini. Isi seperlunya, cukup supaya sesama anggota mengenalmu. Data profil disimpan di server Whitzard, tidak di blockchain.",
    },
  },
};

export type Dict = typeof id;

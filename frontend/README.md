# Whitzard — Frontend

Demo UI for [Whitzard](../README.md): members sign in with their wallet, ask for help, chip in their
share and follow every step on-chain. Indonesian (default) and English, mobile-first.

**It never holds keys or moves funds.** Every state-changing action is a transaction (or signature)
the member approves in their own wallet, sent straight to the contracts. The [backend](../backend/)
only serves data: profiles, the indexed history, evidence documents and notifications.

**Stack:** Next.js 16 (App Router, React Compiler) · wagmi + viem · TanStack Query · Tailwind CSS 4 ·
Base UI (shadcn) · Sonner

## Run

```shell
pnpm install
cp .env.example .env.local     # contract addresses + API URL (Sepolia by default)
pnpm dev                       # http://localhost:3000
```

The backend must be running (`NEXT_PUBLIC_API_URL`, default `http://127.0.0.1:8080`).

**Local chain instead of Sepolia:** `../backend/scripts/dev.sh` starts a Hardhat node, deploys the
contracts, runs the backend and writes `.env.development.local` (it overrides `.env.local` under
`pnpm dev`, and is removed when the script stops), with the Hardhat test accounts offered as
wallets. Then run `pnpm dev` in another terminal.

| Variable | |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | backend base URL |
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` (Sepolia) or `31337` (local Hardhat) |
| `NEXT_PUBLIC_RPC_URL` | optional RPC for reads; defaults to the chain's public RPC |
| `NEXT_PUBLIC_TOKEN_ADDRESS` · `_REGISTRY_` · `_ESCROW_` | deployed contract addresses |
| `NEXT_PUBLIC_DEV_ACCOUNTS` | local chain only: offer the Hardhat accounts as wallets |

All of these are public (bundled into the browser). Never put secrets here.

```shell
pnpm lint
pnpm build
```

## Pages

| Route | |
| --- | --- |
| `/` | Landing page: how it works, community totals |
| `/gabung` | Onboarding: test ETH for gas, top up WHZD, register, profile, turn on _Siap membantu_ |
| `/beranda` | Dashboard: balance and totals, _Siap membantu_ switch, whether you can open a request, running requests for you (carousel, unanswered first) and yours, the member list |
| `/permintaan` | Every request, filtered (all / for me / mine, running / finished) and searchable |
| `/permintaan/[id]` | One request: funding and share grid, story, evidence (checked against its on-chain hash), actions, and the full history with a transaction link for each step |
| `/ajukan` | Open a request: story, amount, duration, evidence document; or why you can't yet |
| `/notifikasi` | All notifications (the bell in the header shows the latest) |
| `/profil` | Your profile and photo |

## How it talks to the chain

- **Sign in** is Sign-In with Ethereum: the wallet signs a message from the backend, which returns a
  session token for API calls (`src/lib/session.tsx`).
- **Transactions** go through `useTx()` (`src/lib/tx.ts`): wallet → mined → indexed by the backend →
  refresh. Every call names what the member is approving; while the wallet is open the page shows
  it, with the contract and function the wallet will display (`src/lib/wallet-prompt.ts`), since a
  site can't put its own words in the wallet's popup.
- **Contributing** takes one transaction: `contribute` if the Escrow already has an allowance,
  otherwise an EIP-2612 permit signature followed by `contributeWithPermit`.
- **Transparency:** each on-chain step in a request's history links to its transaction on Etherscan;
  evidence documents are hashed in the browser and compared with the hash stored on-chain.
- **Privacy:** who declined or didn't answer is only counted, never named.
- **Live updates:** a WebSocket to the backend pushes notifications, which refresh the affected data.
- **Languages:** every page exists under `app/[lang]` (`id`, `en`), but URLs stay unprefixed:
  `src/proxy.ts` rewrites each request to the tree named by the `lang` cookie (default `id`). The
  switch (landing header, account menu) sets the cookie and reloads. All text lives in
  `src/lib/i18n/id.tsx`; `en.tsx` must match its shape, so TypeScript flags a missing translation.
  Components read it with `useI18n()` (`t` for text, `fmt` for amounts and dates in that language).
  Notifications are written from their type and amount, so they follow the language too.

## Layout

```
src/app/[lang]/(public)/  landing page
src/app/[lang]/(app)/     signed-in pages (wrapped in MemberGate)
src/proxy.ts              picks the language tree from the `lang` cookie
src/lib/i18n/             dictionaries (id is the source, en matches it) and useI18n()
src/components/           pages and their parts; ui/ is shadcn (Base UI) primitives
src/lib/api.ts            backend client and response types
src/lib/queries.ts        TanStack Query hooks and keys
src/lib/abi/              GENERATED contract ABIs (scripts/gen-abi.mjs)
src/lib/contracts.ts      contract addresses + ABIs for wagmi
```

After a contract change: `(cd ../blockchain && pnpm hardhat build) && node scripts/gen-abi.mjs`.

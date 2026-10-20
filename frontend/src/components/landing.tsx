"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ChevronDown, MoveHorizontal, RotateCcw } from "lucide-react";
import { formatEther } from "viem";
import { sepolia } from "wagmi/chains";

import { Logo, TestnetPill } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import { SignInButton } from "@/components/sign-in-button";
import { EqualShareDoodle, HourglassDoodle, NoPolicyDoodle, TurnsDoodle } from "@/components/doodles";
import { Swap } from "@/components/swap";
import { SEPOLIA_FAUCET } from "@/components/top-up";
import { appConfig } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import { useStats } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { useReveal } from "@/lib/use-reveal";
import { cn } from "@/lib/utils";
import { chain } from "@/lib/wagmi";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const order = (i: number) => ({ "--i": i }) as CSSProperties;

/** The public page: what Whitzard is, how it works, live totals. Signed-in members go straight to the app. */
export function Landing() {
  const { t } = useI18n();
  const router = useRouter();
  const { status } = useSession();
  useEffect(() => {
    if (status === "signed-in") router.replace("/beranda");
  }, [status, router]);

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="flex-1">
        <Hero />
        <Marquee />
        <NewWay />
        <HowItWorks />
        <Compare />
        <Transparency />
        <Faq />
        <Join />
      </main>
      <footer className="grain grain-light wave-top bg-pandan-deep">
        <div className="mx-auto flex max-w-290 flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-white/70 sm:px-6">
          <Logo inverted />
          <div className="flex max-w-xl flex-col gap-2">
            <p>{t.landing.footer}</p>
            {/* <p className="text-[13px]">{t.landing.disclaimer}</p> */}
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Sticky and frosted, grained like the hero beneath it and edged with a green wavy line: the header
 * and the hero share a colour, so the line is what separates them.
 */
function Header() {
  const { t } = useI18n();
  return (
    <header className="grain wave-bottom sticky top-0 z-40 -mb-2.5 bg-embun/85 backdrop-blur-md">
      <span aria-hidden="true" className="wave-line pointer-events-none absolute inset-x-0 bottom-0 h-2.5" />
      <div className="mx-auto flex h-19 w-full max-w-290 items-center gap-8 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo />
          <TestnetPill className="hidden sm:inline-flex" />
        </div>
        {/* Four links only fit beside the language switch and sign-in from lg up. */}
        <nav aria-label={t.landing.navLabel} className="hidden flex-1 gap-7 font-semibold text-batu lg:flex">
          <a href="#cara-kerja" className="transition-colors hover:text-arang">{t.landing.nav.how}</a>
          <a href="#bedanya" className="transition-colors hover:text-arang">{t.landing.nav.compare}</a>
          <a href="#tanya-jawab" className="transition-colors hover:text-arang">{t.landing.nav.faq}</a>
          <a href="#bergabung" className="transition-colors hover:text-arang">{t.landing.nav.join}</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitch />
          <SignInButton />
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- hero

function Hero() {
  const { t } = useI18n();
  return (
    <div className="grain overflow-hidden">
      <section className="mx-auto grid max-w-290 items-center gap-12 px-4 pt-10 pb-20 sm:px-6 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
        <div className="flex flex-col gap-7">
          <h1 className="max-w-[13ch] text-[44px] leading-[1.02] font-extrabold tracking-[-0.035em] text-pandan sm:text-[61px]">
            {t.landing.hero.title}
          </h1>
          <p className="max-w-[52ch] text-lg leading-relaxed text-batu">{t.landing.hero.body}</p>
          <div className="flex flex-wrap items-center gap-4">
            <SignInButton size="lg" label={t.signIn.withWallet} />
            <a
              href="#cara-kerja"
              className="nudge-down pressable inline-flex h-13 items-center gap-1.5 rounded-full px-5 font-semibold text-pandan hover:bg-pandan-soft"
            >
              {t.landing.hero.seeHow}
              <ChevronDown aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>
        <HeroDemo />
      </section>
    </div>
  );
}

const DEMO_CELLS = 12;
const DEMO_START = 9;
const DEMO_SHARE = 20;

/**
 * The share grid as a toy: tap the empty shares to chip in. When the last one is in, the funds go
 * out together (every share turns green in a wave). Static on load, so a reload never blinks.
 */
function HeroDemo() {
  const { t } = useI18n();
  const demo = t.landing.demo;
  const [filled, setFilled] = useState(() => new Set(range(DEMO_START)));
  const [chipped, setChipped] = useState<Set<number>>(() => new Set());
  const [sent, setSent] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const chip = (i: number) => {
    const next = new Set(filled).add(i);
    setFilled(next);
    setChipped(new Set(chipped).add(i));
    // A beat after the last share lands, the escrow pays out.
    if (next.size === DEMO_CELLS) timer.current = window.setTimeout(() => setSent(true), 550);
  };
  const replay = () => {
    setSent(false);
    setFilled(new Set(range(DEMO_START)));
    setChipped(new Set());
  };

  const firstEmpty = range(DEMO_CELLS).find((i) => !filled.has(i));
  const collected = filled.size * DEMO_SHARE;

  return (
    <figure className="hero-figure relative mx-auto w-full max-w-115">
      <div aria-hidden="true" className="tilt-backdrop absolute -inset-4 -z-10 -rotate-3 rounded-[36px] bg-pandan-soft grain" />
      <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-[0_24px_48px_-24px_rgb(15_61_49/0.25)] sm:p-8 grain">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-kunyit-soft text-lg font-bold text-kunyit-ink">
            S
          </span>
          <div className="flex flex-1 flex-col">
            <span className="font-bold">{demo.name}</span>
            <span className="text-sm text-batu">{demo.need}</span>
          </div>
          {sent && (
            <span className="pop-in flex items-center gap-1 rounded-full bg-daun-soft px-2.5 py-1 text-sm font-semibold text-daun-ink">
              <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
              {demo.forwarded}
            </span>
          )}
        </div>

        <div role="group" aria-label={demo.gridAria} className="grid grid-cols-6 gap-2.5">
          {range(DEMO_CELLS).map((i) => {
            const style = delay(sent ? i * 45 : 0);
            const look = cn(
              "hero-cell aspect-square rounded-xl border",
              sent ? "border-transparent bg-pandan" : filled.has(i) ? "border-transparent bg-kunyit" : "border-garis bg-card",
              chipped.has(i) && !sent && "chip-in",
            );
            return filled.has(i) ? (
              <span key={i} aria-hidden="true" className={look} style={style} />
            ) : (
              <button
                key={i}
                type="button"
                aria-label={demo.chip(DEMO_SHARE)}
                onClick={() => chip(i)}
                className={cn(look, "cursor-pointer hover:border-kunyit active:scale-90", i === firstEmpty && chipped.size === 0 && "invite")}
                style={style}
              />
            );
          })}
        </div>

        <div aria-live="polite" className="flex items-end justify-between gap-4 border-t pt-5">
          <div className="flex flex-col">
            <span className="tabular text-3xl font-extrabold tracking-tight">
              <Swap>{`${collected} WHZD`}</Swap>
            </span>
            <span className="text-sm text-batu">
              <Swap>{sent ? demo.sent : demo.collectedOf(DEMO_CELLS * DEMO_SHARE)}</Swap>
            </span>
          </div>
          {!sent && (
            <div className="flex flex-col items-end text-right">
              <span className="tabular text-lg font-bold">{DEMO_SHARE} WHZD</span>
              <span className="text-sm text-batu">{demo.perMember}</span>
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-6 flex min-h-9 items-center justify-center text-center text-sm text-batu">
        {sent ? (
          <button
            type="button"
            onClick={replay}
            className="pop-in pressable flex items-center gap-1.5 rounded-full px-3 py-2 font-semibold text-pandan hover:bg-pandan-soft"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {demo.replay}
          </button>
        ) : (
          demo.hint
        )}
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------- marquee

/**
 * The promises, scrolling past on a slightly tilted ribbon that straddles the hero and the next
 * section (after arc.net). The list is repeated so the loop never runs short on wide screens;
 * screen readers get it once, and reduced motion stops it (see .marquee in globals.css).
 */
function Marquee() {
  const { t } = useI18n();
  const items = t.landing.marquee;
  return (
    // A zero-height row sitting on the seam; the ribbon hangs off it, wider than the screen so the
    // tilt never shows its ends.
    <div className="relative z-10 h-0 overflow-x-clip">
      <div className="grain grain-light wave-box-y absolute inset-x-[-5%] top-0 -translate-y-1/2 -rotate-2 bg-pandan-deep py-4.5 text-white">
        <div className="marquee flex w-max">
          {range(4).map((copy) => (
            <ul key={copy} aria-hidden={copy > 0 || undefined} className="flex shrink-0 items-center">
              {items.map((item) => (
                <li key={item} className="flex items-center gap-5 pr-5 text-[15px] font-bold tracking-[0.12em] whitespace-nowrap uppercase sm:text-lg">
                  {item}
                  <MarkSeparator />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The logo mark in miniature (three shares in, one turmeric), between the ribbon's phrases. */
function MarkSeparator() {
  return (
    <span aria-hidden="true" className="grid size-3.5 shrink-0 grid-cols-2 gap-0.5">
      <span className="rounded-[2px] bg-white/45" />
      <span className="rounded-[2px] bg-white/45" />
      <span className="rounded-[2px] bg-white/45" />
      <span className="rounded-[2px] bg-kunyit" />
    </span>
  );
}

// ---------------------------------------------------------------- a new way

// Percentages behind t.landing.newWay.figures (same order). Drawn as plain bars, not share cells:
// they are facts about Indonesia, and turmeric/pandan cells already mean "chipped in"/"sent" here.
const gapPercents = [80, 30];

// One doodle per card of t.landing.newWay.cards, in the same order.
const promiseDoodles = [NoPolicyDoodle, EqualShareDoodle, HourglassDoodle, TurnsDoodle];

/**
 * Why it exists and what sets it apart, kept compact: the coverage gap as two neutral bars beside
 * the intro, then four promises the contracts actually keep, two by two.
 */
function NewWay() {
  const { t } = useI18n();
  const text = t.landing.newWay;
  const block = useReveal<HTMLDivElement>();
  return (
    <section id="cara-baru" className="grain scroll-mt-20 bg-santan">
      <div ref={block} className="mx-auto flex max-w-290 flex-col gap-10 px-4 pt-24 pb-16 sm:px-6">
        <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="rise flex flex-col gap-3">
            <h2 className="text-[39px] leading-tight font-extrabold text-pandan">{text.title}</h2>
            <p className="max-w-[60ch] text-lg leading-relaxed text-batu">{text.intro}</p>
          </div>
          <figure className="rise flex flex-col justify-end gap-5" style={order(1)}>
            <dl className="flex flex-col gap-5">
              {text.figures.map((f, row) => (
                <div key={f.value} className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-3">
                    <dt className="text-sm leading-snug text-batu">{f.label}</dt>
                    <dd className="tabular order-first text-[31px] leading-none font-extrabold tracking-tight text-arang">{f.value}</dd>
                  </div>
                  <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-garis">
                    <span className="block h-full rounded-full bg-arang" style={{ width: `${gapPercents[row]}%` }} />
                  </span>
                </div>
              ))}
            </dl>
            <figcaption className="text-[13px] text-batu">{text.source}</figcaption>
          </figure>
        </div>

        <ol className="grid gap-x-12 gap-y-8 md:grid-cols-2">
          {text.cards.map((card, i) => {
            const Doodle = promiseDoodles[i];
            return (
              <li key={card.title} className="rise flex gap-4" style={order(i + 2)}>
                <Doodle className="size-14 text-pandan" />
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[22px] leading-tight font-extrabold">{card.title}</h3>
                  <p className="leading-relaxed text-batu">{card.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- how it works

type Play = "appear" | "fill" | "send";

/**
 * A tiny share grid that plays out its step once scrolled in: shares appear (split), fill
 * (contributions), or turn green (sent). `start` offsets it after the previous step's grid.
 */
function MiniGrid({ total = 8, filled = total, play, start }: { total?: number; filled?: number; play: Play; start: number }) {
  return (
    <span aria-hidden="true" className="grid w-26 grid-cols-4 gap-1.5">
      {range(total).map((i) => {
        const on = i < filled;
        return (
          <span
            key={i}
            style={delay(start + i * 60)}
            className={cn(
              "cell aspect-square rounded-[5px] border",
              play === "appear" && "cell-appear border-garis bg-card",
              play === "fill" && (on ? "cell-fill border-transparent bg-kunyit" : "border-garis bg-card"),
              play === "send" && "cell-send border-transparent bg-pandan",
            )}
          />
        );
      })}
    </span>
  );
}

// One grid per step of t.landing.how.steps, in the same order.
const stepGrids: ((start: number) => React.ReactNode)[] = [
  (start) => <MiniGrid total={1} play="appear" start={start} />,
  (start) => <MiniGrid play="appear" start={start} />,
  (start) => <MiniGrid filled={5} play="fill" start={start} />,
  (start) => <MiniGrid play="send" start={start} />,
];

function HowItWorks() {
  const { t } = useI18n();
  const intro = useReveal<HTMLDivElement>();
  const list = useReveal<HTMLOListElement>();
  return (
    <section id="cara-kerja" className="grain wave-top scroll-mt-20 bg-card">
      <div className="mx-auto flex max-w-290 flex-col gap-12 px-4 py-20 sm:px-6">
        <div ref={intro} className="flex max-w-2xl flex-col gap-3">
          <h2 className="rise text-[39px] leading-tight font-extrabold text-pandan">{t.landing.how.title}</h2>
          <p className="rise text-lg leading-relaxed text-batu" style={order(1)}>
            {t.landing.how.intro}
          </p>
        </div>
        {/* Each step's grid starts after the previous one, so the four read as one story; on wide
            screens a line joins the numbers, running into the next column (-mr-8 = the gap). */}
        <ol ref={list} className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {t.landing.how.steps.map((step, i, steps) => (
            <li key={step.title} className="rise flex flex-col gap-4" style={order(i)}>
              <div className="flex h-14 items-end">{stepGrids[i](250 + i * 450)}</div>
              <div className="flex items-center gap-3">
                <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-pandan text-sm font-bold text-white">
                  {i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span aria-hidden="true" className="hidden h-0.5 flex-1 rounded-full bg-garis lg:-mr-8 lg:block" />
                )}
              </div>
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="leading-relaxed text-batu">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- compare

/**
 * Whitzard against the two usual ways of chipping in: a treasurer, or a central platform. A table,
 * so each row reads across; on phones it scrolls sideways with the row labels pinned.
 */
function Compare() {
  const { t } = useI18n();
  const text = t.landing.compare;
  const block = useReveal<HTMLDivElement>();
  return (
    <section id="bedanya" className="grain wave-top scroll-mt-20 bg-embun">
      <div ref={block} className="mx-auto flex max-w-290 flex-col gap-10 px-4 py-20 sm:px-6">
        <div className="rise flex max-w-2xl flex-col gap-3">
          <h2 className="text-[39px] leading-tight font-extrabold text-pandan">{text.title}</h2>
          <p className="text-lg leading-relaxed text-batu">{text.intro}</p>
        </div>
        <div className="rise flex flex-col gap-3" style={order(1)}>
          <p className="flex items-center gap-2 text-sm text-batu md:hidden">
            <MoveHorizontal aria-hidden="true" className="size-4" />
            {text.scrollHint}
          </p>
          {/* Focusable, so keyboard users can scroll it too. */}
          <div role="region" aria-label={text.title} tabIndex={0} className="overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-160 border-collapse text-left">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-32 bg-card p-4 sm:w-48">
                    <span className="sr-only">{text.aspect}</span>
                  </th>
                  {text.columns.map((column, i) => (
                    <th
                      key={column}
                      scope="col"
                      className={cn("p-4 align-bottom font-bold", i === 0 ? "bg-pandan text-lg text-white" : "text-batu")}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {text.rows.map((row) => (
                  <tr key={row.label} className="border-t">
                    <th scope="row" className="sticky left-0 z-10 bg-card p-4 align-top text-sm font-semibold">
                      {row.label}
                    </th>
                    {row.values.map((value, i) => (
                      <td
                        key={i}
                        className={cn("p-4 align-top leading-relaxed", i === 0 ? "bg-pandan-soft font-semibold text-pandan-deep" : "text-batu")}
                      >
                        {i === 0 ? (
                          <span className="flex gap-2">
                            <Check aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={3} />
                            {value}
                          </span>
                        ) : (
                          value
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[13px] text-batu">{text.note}</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- transparency

/** Counts up from where it is to `to` (from 0 the first time), once `play` is on. */
function CountUp({ to, play, format }: { to?: number; play: boolean; format: (n: number) => string }) {
  const [value, setValue] = useState<number | null>(null);
  const current = useRef(0);
  useEffect(() => {
    if (!play || to === undefined) return;
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      current.current = from + (to - from) * (1 - (1 - t) ** 4); // ease-out quart
      setValue(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [play, to]);

  if (to === undefined) return "–";
  return format(play ? (value ?? 0) : to);
}

function Transparency() {
  const { t, fmt } = useI18n();
  const text = t.landing.transparency;
  const whole = (n: number) => fmt.number(n);
  const { data: stats } = useStats();
  const [count, setCount] = useState(false);
  const block = useReveal<HTMLDivElement>((animate) => {
    // Count up when scrolled to, unless the visitor prefers less motion.
    if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setCount(true);
  });
  const figures = [
    { value: stats?.members, label: text.figures.members, format: whole },
    { value: stats?.readyMembers, label: text.figures.ready, format: whole },
    { value: stats?.funded, label: text.figures.funded, format: whole },
    {
      value: stats ? Number(formatEther(BigInt(stats.distributed))) : undefined,
      label: text.figures.distributed,
      format: (n: number) => fmt.number(n, 2),
    },
  ];
  const contracts = [
    { name: "Escrow", address: appConfig.escrow, note: text.contracts.escrow },
    { name: "Registry", address: appConfig.registry, note: text.contracts.registry },
    { name: text.contracts.tokenName, address: appConfig.token, note: text.contracts.token },
  ];

  return (
    <section id="transparan" className="grain grain-light wave-top scroll-mt-20 bg-pandan-deep text-white">
      <div ref={block} className="mx-auto flex max-w-290 flex-col gap-14 px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <h2 className="rise max-w-[16ch] text-[39px] leading-tight font-extrabold">{text.title}</h2>
          <ul className="rise flex flex-col gap-5 text-lg leading-relaxed text-white/80" style={order(1)}>
            {text.points(chain.name).map((point) => (
              <li key={point.lead}>
                <strong className="text-white">{point.lead}</strong> {point.body}
              </li>
            ))}
          </ul>
        </div>

        <dl className="rise grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-white/15 lg:grid-cols-4" style={order(2)}>
          {figures.map((f) => (
            <div key={f.label} className="grain grain-light flex flex-col-reverse gap-1 bg-pandan-deep p-6">
              <dt className="text-sm text-white/70">{f.label}</dt>
              <dd className="tabular text-[39px] leading-none font-extrabold tracking-tight">
                <CountUp to={f.value} play={count} format={f.format} />
              </dd>
            </div>
          ))}
        </dl>

        <div className="rise flex flex-col gap-4" style={order(3)}>
          <h3 className="text-xl font-bold">{text.check}</h3>
          <ul className="grid gap-3 md:grid-cols-3">
            {contracts.map((c) => (
              <li key={c.name} className="lift flex flex-col gap-1 rounded-2xl border border-white/15 p-5 hover:border-white/35">
                <span className="font-bold">{c.name}</span>
                <span className="text-sm text-white/70">{c.note}</span>
                {appConfig.explorerUrl ? (
                  <a
                    href={`${appConfig.explorerUrl}/address/${c.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tabular mt-2 self-start text-sm font-semibold text-kunyit underline underline-offset-4"
                  >
                    {text.onExplorer(`${c.address.slice(0, 10)}…${c.address.slice(-6)}`)}
                  </a>
                ) : (
                  <span className="tabular mt-2 text-sm text-white/70">{c.address.slice(0, 10)}…{c.address.slice(-6)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- join

/**
 * The closing call to action, for people new to web3: what to install, where the free test funds
 * come from, and the button to start. A full-width pandan band, so the page ends on it.
 */
function Join() {
  const { t } = useI18n();
  const text = t.landing.join;
  const block = useReveal<HTMLDivElement>();
  // Where each step's link goes, in step order; the faucet only exists for Sepolia.
  const links = ["https://metamask.io/download/", chain.id === sepolia.id ? SEPOLIA_FAUCET : null];
  return (
    <section id="bergabung" className="grain wave-top scroll-mt-20 bg-embun">
      <div className="mx-auto max-w-290 px-4 py-20 sm:px-6">
        <div className="wave-box-x">
          <div ref={block} className="grain grain-light wave-box-y flex flex-col gap-10 bg-pandan-deep px-6 py-16 text-white sm:px-10 sm:py-20">
            <div className="rise mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
              <TestnetPill />
              <h2 className="text-[39px] leading-tight font-extrabold">{text.title}</h2>
              <p className="text-lg leading-relaxed text-white/80">{text.body(chain.name)}</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {text.steps(chain.name).map((step, i) => (
                <li key={step.title} className="rise flex flex-col gap-2 rounded-2xl bg-white/8 p-5" style={order(i + 1)}>
                  <span className="tabular flex size-8 items-center justify-center rounded-full bg-kunyit text-sm font-bold text-pandan-deep">
                    {i + 1}
                  </span>
                  <h3 className="pt-2 text-lg font-bold">{step.title}</h3>
                  <p className="leading-relaxed text-white/75">{step.body}</p>
                  {step.link && links[i] && (
                    <a
                      href={links[i]}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-auto inline-flex items-center gap-1 self-start pt-2 font-semibold text-kunyit underline underline-offset-4"
                    >
                      {step.link}
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                    </a>
                  )}
                </li>
              ))}
            </ol>
            <div className="rise flex flex-col items-center gap-3" style={order(5)}>
              <SignInButton size="lg" label={t.signIn.withWallet} className="bg-white text-pandan-deep hover:bg-pandan-soft" />
              <span className="text-sm text-white/70">{text.time}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- FAQ

function Faq() {
  const { t } = useI18n();
  const block = useReveal<HTMLDivElement>();
  return (
    <section id="tanya-jawab" className="grain wave-top scroll-mt-20 bg-card">
      <div ref={block} className="mx-auto grid max-w-290 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
        <h2 className="rise text-[39px] leading-tight font-extrabold text-pandan">{t.landing.faq.title}</h2>
        <div className="flex flex-col">
          {t.landing.faq.items.map((item, i) => (
            <details key={item.q} className="rise accordion group border-b py-5 first:pt-0" style={order(i + 1)}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-batu transition-transform duration-250 ease-out group-open:rotate-180" />
              </summary>
              <p className="mt-3 max-w-[64ch] leading-relaxed text-batu">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

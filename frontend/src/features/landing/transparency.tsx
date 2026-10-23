"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther } from "viem";

import { useReveal, useStats } from "@/features/landing/landing.hooks";
import { order } from "@/features/landing/landing.lib";
import { appConfig, chain } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

type CountUpProps = {
  to?: number;
  play: boolean;
  format: (n: number) => string;
};

/** Counts up from where it is to `to` (from 0 the first time), once `play` is on. */
function CountUp(props: CountUpProps) {
  const { to, play, format } = props;
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

export function Transparency() {
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
    <section id="transparency" className="grain grain-light wave-top scroll-mt-20 bg-pandan-deep text-white">
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

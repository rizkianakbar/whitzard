"use client";

import { createContext, type ReactNode, useContext } from "react";
import { formatEther } from "viem";

import { defaultLocale, type Locale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/en";
import { type Dict, id } from "@/lib/i18n/id";

export type { Dict } from "@/lib/i18n/id";
export type { Locale } from "@/lib/i18n/config";

const dictionaries: Record<Locale, Dict> = { id, en };

/** Day-first, 24-hour English, closer to Indonesian habits than en-US. */
const tags: Record<Locale, string> = { id: "id-ID", en: "en-GB" };

type DateLike = string | Date;

function formatters(locale: Locale) {
  const tag = tags[locale];
  const date = (options: Intl.DateTimeFormatOptions) => {
    const format = new Intl.DateTimeFormat(tag, options);
    return (value: DateLike) => format.format(new Date(value));
  };
  const whzd = new Intl.NumberFormat(tag, { maximumFractionDigits: 4 });
  const relative = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  return {
    /** "25", "12,5" / "12.5", "0,0001" WHZD from an amount in the smallest unit. */
    whzd: (amount: string | bigint) => whzd.format(Number(formatEther(BigInt(amount)))),
    number: (n: number, maximumFractionDigits = 0) => n.toLocaleString(tag, { maximumFractionDigits }),
    /** "20 Oktober 2026 pukul 10.25" / "20 October 2026 at 10:25". */
    date: date({ dateStyle: "long", timeStyle: "short" }),
    day: date({ dateStyle: "long" }),
    dayMonth: date({ day: "numeric", month: "short" }),
    dayMonthYear: date({ day: "numeric", month: "short", year: "numeric" }),
    stamp: date({ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    weekdayTime: date({ weekday: "long", hour: "2-digit", minute: "2-digit" }),
    /** "3 jam lalu", "kemarin" / "3 hours ago", "yesterday". */
    timeAgo(value: DateLike, now: number): string {
      const seconds = Math.round((new Date(value).getTime() - now) / 1000);
      const steps: [Intl.RelativeTimeFormatUnit, number][] = [
        ["day", 86400],
        ["hour", 3600],
        ["minute", 60],
      ];
      for (const [unit, size] of steps) {
        if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
      }
      return dictionaries[locale].common.justNow;
    },
  };
}

export type Formatters = ReturnType<typeof formatters>;
export type I18n = { locale: Locale; t: Dict; fmt: Formatters };

// Built once per language, so useI18n() hands out the same object on every render.
const bundles = Object.fromEntries(
  (Object.keys(dictionaries) as Locale[]).map((locale) => [locale, { locale, t: dictionaries[locale], fmt: formatters(locale) }]),
) as Record<Locale, I18n>;

const LocaleContext = createContext<Locale>(defaultLocale);

/** The language comes from the route (app/[lang]), so server and browser always render the same text. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n(): I18n {
  return bundles[useContext(LocaleContext)];
}

/**
 * Remembers the choice for a year and reloads, so the proxy serves the other language's tree and
 * nothing cached in the old language (prefetched pages, toasts) survives.
 */
export function switchLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}

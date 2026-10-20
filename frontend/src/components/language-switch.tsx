"use client";

import { locales } from "@/lib/i18n/config";
import { switchLocale, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** ID | EN, for headers. Each option is named in its own language, so it reads right either way. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  return (
    <div role="group" aria-label={t.language.label} className={cn("flex shrink-0 gap-0.5 rounded-full border bg-card p-1", className)}>
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-label={t.language.names[l]}
          title={t.language.names[l]}
          aria-pressed={l === locale}
          onClick={() => l !== locale && switchLocale(l)}
          className={cn(
            "pressable h-9 min-w-10 rounded-full px-2.5 text-[13px] font-bold text-batu hover:text-arang",
            l === locale && "bg-pandan text-white hover:text-white",
          )}
        >
          {t.language.short[l]}
        </button>
      ))}
    </div>
  );
}

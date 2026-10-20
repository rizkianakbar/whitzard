import type { Metadata } from "next";
import { lang } from "next/root-params";

import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/en";
import { type Dict, id } from "@/lib/i18n/id";

/** The current route's dictionary, for Server Components and metadata. */
export async function dictionary(): Promise<Dict> {
  const locale = await lang();
  return (isLocale(locale) ? locale : defaultLocale) === "en" ? en : id;
}

/** A page's <title> in the current language. */
export async function pageTitle(key: keyof Dict["meta"]["titles"]): Promise<Metadata> {
  return { title: (await dictionary()).meta.titles[key] };
}

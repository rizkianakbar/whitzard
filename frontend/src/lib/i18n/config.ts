// Shared by the proxy (edge) and the app, so no React here.

export const locales = ["id", "en"] as const;
export type Locale = (typeof locales)[number];

/** Indonesian first: the app is built for Indonesian communities. */
export const defaultLocale: Locale = "id";

/** The visitor's choice. The proxy reads it to serve the matching app/[lang] tree. */
export const LOCALE_COOKIE = "lang";

export const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale);

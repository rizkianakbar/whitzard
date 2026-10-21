// Shared by the proxy (edge) and the app, so no React here.

export const locales = ["en", "id"] as const;
export type Locale = (typeof locales)[number];

/** English by default; Indonesian stays one switch away. */
export const defaultLocale: Locale = "en";

/** The visitor's choice. The proxy reads it to serve the matching app/[lang] tree. */
export const LOCALE_COOKIE = "lang";

export const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale);

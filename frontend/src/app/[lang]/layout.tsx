import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";

import { Providers } from "@/components/providers";
import { dictionary } from "@/lib/i18n/server";
import { isLocale, locales } from "@/lib/i18n/config";
import "../globals.css";

// Designed by Tokotype in Jakarta.
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

// Both languages are prerendered; the proxy picks one per visitor from the language cookie.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { default: "Whitzard", template: "%s | Whitzard" },
    description: (await dictionary()).meta.description,
  };
}

// viewport-fit=cover makes env(safe-area-inset-*) real, so the bottom nav clears the home indicator.
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#ffffff" };

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await lang();
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={`${jakarta.variable} h-full`} data-scroll-behavior="smooth">
      <body className="min-h-full">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}

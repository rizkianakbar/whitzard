import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/components/providers";
import "./globals.css";

// Designed by Tokotype in Jakarta.
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Whitzard", template: "%s | Whitzard" },
  description: "Saling bantu biaya berobat antaranggota, dengan iuran yang sama dan tercatat untuk semua.",
};

// viewport-fit=cover makes env(safe-area-inset-*) real, so the bottom nav clears the home indicator.
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

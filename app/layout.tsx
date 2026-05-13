import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { MotionProvider } from "@/components/MotionProvider";
import { routing } from "@/i18n/routing";
import { getSiteMetadataBase } from "@/lib/seo";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });
const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: getSiteMetadataBase(),
  title: "PopularTickets",
  description: "Bilety na wydarzenia w Polsce — PopularTickets.",
  applicationName: "PopularTickets",
  openGraph: {
    siteName: "PopularTickets",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0709",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /** Для `/admin`, `/check-in` middleware выставляет локаль по умолчанию; для `[locale]` — см. `DocumentLangSync`. */
  let locale: string;
  try {
    locale = await getLocale();
  } catch {
    locale = routing.defaultLocale;
  }

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased poet-safe-b">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}

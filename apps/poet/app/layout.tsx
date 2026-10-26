import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { routing } from "@/i18n/routing";
import { getLocale } from "next-intl/server";

const inter = localFont({
  src: "../../../assets/fonts/Inter.ttf",
  variable: "--font-sans",
  weight: "100 900",
});
const playfair = localFont({
  src: "../../../assets/fonts/PlayfairDisplay.ttf",
  variable: "--font-display",
  weight: "400 900",
});

export const metadata: Metadata = {
  title: {
    default: "Popular Poet",
    template: "%s · Popular Poet",
  },
  description: "Popular Poet — theatre and courses in Warsaw.",
  applicationName: "Popular Poet",
  openGraph: { siteName: "Popular Poet", type: "website" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0709",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestLocale = await getLocale();
  const locale = routing.locales.includes(requestLocale as (typeof routing.locales)[number]) ? requestLocale : routing.defaultLocale;
  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased poet-safe-b">
        <div className="relative z-10 flex min-h-dvh flex-col">
          <div className="poet-curtain" aria-hidden />
          <div className="relative z-[2] flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}

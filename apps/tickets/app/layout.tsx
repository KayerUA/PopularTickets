import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/MotionProvider";
import { getRequestAppLocale } from "@/lib/requestLocale";
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
  /** `lang`: заголовок от middleware + резерв (см. `DocumentLangSync` при клиентской смене языка). */
  const locale = await getRequestAppLocale();

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased poet-safe-b">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}

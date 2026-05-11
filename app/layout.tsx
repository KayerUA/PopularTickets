import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { MotionProvider } from "@/components/MotionProvider";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });
const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "PopularTickets",
  description: "Bilety na wydarzenia w Polsce.",
  openGraph: {
    siteName: "PopularTickets",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070708",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased poet-safe-b">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}

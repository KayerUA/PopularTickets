import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { PoetFooter } from "@/components/PoetFooter";
import { PoetHeader } from "@/components/PoetHeader";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-sans" });
const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Popular Poet — teatr i kursy",
    template: "%s · Popular Poet",
  },
  description:
    "Popular Poet — improwizacja aktorska, warsztaty aktorskie, grupy PLAY-BACK i zajęcia próbne. Bilety na wydarzenia w serwisie PopularTickets.",
  applicationName: "Popular Poet",
  openGraph: {
    siteName: "Popular Poet",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0709",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased poet-safe-b">
        <div className="relative z-10 flex min-h-dvh flex-col">
          <div className="poet-curtain" aria-hidden />
          <div className="relative z-[2] flex min-h-0 flex-1 flex-col">
            <PoetHeader />
            <main className="flex-1 overflow-x-hidden">{children}</main>
            <PoetFooter />
          </div>
        </div>
      </body>
    </html>
  );
}

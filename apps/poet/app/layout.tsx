import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Popular Poet",
  description: "Teatr, kursy improwizacji i warsztaty — Popular Poet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body style={{ margin: 0, padding: "2.5rem 1.5rem", maxWidth: "40rem", marginInline: "auto" }}>
        {children}
      </body>
    </html>
  );
}

import Script from "next/script";
import type { ReactNode } from "react";

export default function TelegramMiniAppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <div className="min-h-dvh bg-zinc-950 text-zinc-100">{children}</div>
    </>
  );
}

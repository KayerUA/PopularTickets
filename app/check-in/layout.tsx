import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CheckInLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 min-h-dvh overflow-x-hidden bg-poet-bg font-sans antialiased">
      <div className="poet-curtain" aria-hidden />
      {children}
    </div>
  );
}

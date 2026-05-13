import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <div className="poet-curtain" aria-hidden />
      {/* z-[2] выше .poet-curtain (z-index: 1), иначе полосы занавеса рисуются поверх футера и белых блоков */}
      <div className="relative z-[2] flex min-h-0 flex-1 flex-col">
        <SiteHeader />
        <main className="flex-1 overflow-x-hidden">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

/** Special доступен по ссылке, но остаётся частью обычного сайта. */
export default function SpecialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <div className="poet-curtain" aria-hidden />
      <div className="relative z-[2] flex min-h-0 flex-1 flex-col">
        <SiteHeader />
        <main className="flex-1 overflow-x-hidden">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}

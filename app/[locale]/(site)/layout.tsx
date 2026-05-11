import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col overflow-x-hidden">
      <div className="poet-curtain" aria-hidden />
      <SiteHeader />
      <main className="relative z-0 flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

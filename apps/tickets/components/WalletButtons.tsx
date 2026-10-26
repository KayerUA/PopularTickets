import type { WalletLinks } from "@/lib/wallet/links";
import type { WalletButtonLabels } from "@/lib/wallet/labels";

export function WalletButtons({ links, labels }: { links: WalletLinks; labels: WalletButtonLabels }) {
  if (!links.apple && !links.google) return null;

  return (
    <div className="flex w-full flex-col gap-2">
      {links.apple ? (
        <a href={links.apple} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-zinc-500/50 bg-black px-4 py-2 text-center text-sm font-medium text-white transition hover:border-white/70">
          {labels.apple}
        </a>
      ) : null}
      {links.google ? (
        <a href={links.google} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-poet-gold/45 bg-[#171317] px-4 py-2 text-center text-sm font-medium text-poet-gold-bright transition hover:border-poet-gold/70">
          {labels.google}
        </a>
      ) : null}
    </div>
  );
}

import { getTranslations } from "next-intl/server";

export async function PoetMarquee() {
  const t = await getTranslations("Poet");
  const phrase = t("marqueePhrase");

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border-y border-poet-gold/20 bg-zinc-950/40 py-2 sm:mb-12 sm:rounded-full sm:border sm:py-2.5">
      <p className="sr-only">{t("heroTitle")}</p>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-poet-bg to-transparent sm:w-24"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-poet-bg to-transparent sm:w-24"
        aria-hidden
      />
      <div className="seo-safe-marquee-track animate-marquee" data-marquee={phrase} aria-hidden="true" />
    </div>
  );
}

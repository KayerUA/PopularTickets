import { getTranslations } from "next-intl/server";

export async function MarqueeStrip() {
  const t = await getTranslations("Marquee");
  const phrase = t("phrase");
  const run = (phrase + phrase).repeat(6);

  return (
    <div className="relative mb-10 overflow-hidden rounded-xl border-y border-poet-gold/20 bg-zinc-950/40 py-2.5 sm:mb-12 sm:rounded-full sm:border">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-poet-bg to-transparent sm:w-24"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-poet-bg to-transparent sm:w-24"
        aria-hidden
      />
      <div className="flex w-max animate-marquee">
        <p className="shrink-0 whitespace-nowrap px-6 font-mono text-[10px] font-medium uppercase tracking-[0.35em] text-poet-gold/75 sm:text-[11px]">
          {run}
        </p>
        <p
          className="shrink-0 whitespace-nowrap px-6 font-mono text-[10px] font-medium uppercase tracking-[0.35em] text-poet-gold/75 sm:text-[11px]"
          aria-hidden
        >
          {run}
        </p>
      </div>
    </div>
  );
}

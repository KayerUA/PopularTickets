import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function SiteNotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="poet-safe-x mx-auto flex max-w-lg flex-col items-center py-16 text-center sm:py-24">
      <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-zinc-500">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-zinc-50 sm:text-3xl">{t("title")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">{t("body")}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-poet btn-poet-theatre px-5 py-3 text-sm font-semibold">
          {t("home")}
        </Link>
        <Link
          href="/events"
          className="rounded-xl border border-poet-gold/35 bg-zinc-900/60 px-5 py-3 text-sm font-semibold text-poet-gold-bright transition hover:border-poet-gold/55 hover:bg-poet-gold/10"
        >
          {t("events")}
        </Link>
      </div>
    </div>
  );
}

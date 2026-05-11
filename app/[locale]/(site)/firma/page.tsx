import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { COMPANY, companyAddressOneLine, publicContactEmail, PRZELEWY24_LINKS, krsPublicSearchUrl } from "@/lib/company";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("firmaTitle"),
    description: t("firmaDescription"),
  };
}

export default async function FirmaPage() {
  const t = await getTranslations("Legal");
  const addr = companyAddressOneLine();
  const email = publicContactEmail();

  return (
    <div className="poet-safe-x mx-auto max-w-3xl py-8 sm:py-12">
      <p className="text-sm text-zinc-500">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center rounded-lg py-1 text-poet-gold hover:text-poet-gold-bright"
        >
          {t("backHome")}
        </Link>
      </p>
      <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight sm:mt-6 sm:text-4xl">
        <span className="text-gradient-gold">{t("title")}</span>
      </h1>
      <p className="mt-3 break-words text-zinc-400">{t("intro", { product: COMPANY.productName })}</p>

      <section className="mt-8 space-y-5 rounded-2xl border border-poet-gold/20 bg-poet-surface/40 p-4 shadow-gold-sm backdrop-blur-sm sm:mt-10 sm:p-8">
        <h2 className="font-display text-xl font-medium text-zinc-100">{t("sellerTitle")}</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">{t("legalNameLabel")}</dt>
            <dd className="mt-1 break-words text-zinc-200">{COMPANY.legalName}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{t("nipLabel")}</dt>
            <dd className="mt-1 font-mono text-zinc-200">{COMPANY.nip}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{t("krsLabel")}</dt>
            <dd className="mt-1 font-mono text-zinc-200">{COMPANY.krs}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{t("regonLabel")}</dt>
            <dd className="mt-1 font-mono text-zinc-200">{COMPANY.regon}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">{t("addressLabel")}</dt>
            <dd className="mt-1 text-zinc-200">
              {addr}, {COMPANY.address.voivodeship}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-8 space-y-3 rounded-2xl border border-poet-gold/20 bg-poet-surface/40 p-4 shadow-gold-sm backdrop-blur-sm sm:p-8">
        <h2 className="font-display text-xl font-medium text-zinc-100">{t("contactTitle")}</h2>
        {email ? (
          <p className="text-sm text-zinc-300">
            <a href={`mailto:${email}`} className="text-poet-gold hover:text-poet-gold-bright">
              {email}
            </a>
          </p>
        ) : (
          <p className="text-sm text-amber-300/90">
            {t("contactEnvHint")}
          </p>
        )}
        <p className="text-xs text-zinc-500">{t("contactHint")}</p>
        <p className="pt-2 text-sm">
          <a
            href={krsPublicSearchUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-poet-gold hover:text-poet-gold-bright"
          >
            {t("krsLink")}
          </a>
        </p>
      </section>

      <section className="mt-8 space-y-4 rounded-2xl border border-poet-gold/20 bg-poet-surface/40 p-4 shadow-gold-sm backdrop-blur-sm sm:p-8">
        <h2 className="font-display text-xl font-medium text-zinc-100">{t("paymentsTitle")}</h2>
        <p className="break-words text-sm leading-relaxed text-zinc-300">
          {t("paymentsLead")}{" "}
          <a
            href={PRZELEWY24_LINKS.site}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-poet-gold hover:text-poet-gold-bright"
          >
            Przelewy24
          </a>
          . {t("paymentsBody", { seller: COMPANY.legalNameShort })}
        </p>
        <ul className="list-inside list-disc space-y-2 break-words pl-0.5 text-sm text-zinc-400 sm:pl-0">
          <li>
            <a href={PRZELEWY24_LINKS.regulamin} target="_blank" rel="noopener noreferrer" className="text-poet-gold hover:text-poet-gold-bright">
              {t("p24Terms")}
            </a>
          </li>
          <li>
            <a href={PRZELEWY24_LINKS.privacy} target="_blank" rel="noopener noreferrer" className="text-poet-gold hover:text-poet-gold-bright">
              {t("p24Privacy")}
            </a>
          </li>
          <li>
            <a href={PRZELEWY24_LINKS.merchants} target="_blank" rel="noopener noreferrer" className="text-poet-gold hover:text-poet-gold-bright">
              {t("p24Merchants")}
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}

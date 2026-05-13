import { COMPANY, companyAddressOneLine, PRZELEWY24_LINKS, publicContactEmail } from "@/lib/company";
import type { AppLocale } from "@/i18n/routing";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { canonicalPath } from "@/lib/seo";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const DOC_LINKS: Record<AppLocale, { terms: string; privacy: string; returns: string }> = {
  pl: { terms: "Regulamin", privacy: "Polityka prywatności", returns: "Zwroty i reklamacje" },
  uk: { terms: "Регламент", privacy: "Політика конфіденційності", returns: "Повернення та скарги" },
  ru: { terms: "Правила (оферта)", privacy: "Политика конфиденциальности", returns: "Возвраты и рекламации" },
};

const DOC_INTRO: Record<AppLocale, string> = {
  pl: "Przydatne linki:",
  uk: "Корисні посилання:",
  ru: "Полезные ссылки:",
};

/** Krótki blok z danymi operatora w stopce maila (HTML). */
export function companyEmailFooterHtml(locale: AppLocale = "pl"): string {
  const addr = companyAddressOneLine();
  const mail = publicContactEmail();
  const contactLabel =
    locale === "pl" ? "Kontakt:" : locale === "uk" ? "Контакт:" : "Контакт:";
  const onlineSuffix =
    locale === "pl" ? "— bilety online." : locale === "uk" ? "— квитки онлайн." : "— билеты онлайн.";
  const paymentsLine =
    locale === "pl"
      ? `Płatności internetowe: <a href="${esc(PRZELEWY24_LINKS.site)}" style="color:#e8d48b;text-decoration:none;">Przelewy24</a> — <a href="${esc(PRZELEWY24_LINKS.regulamin)}" style="color:#c5a059;text-decoration:underline;text-decoration-color:rgba(197,160,89,0.45);">regulamin operatora</a>.`
      : locale === "uk"
        ? `Онлайн-оплата: <a href="${esc(PRZELEWY24_LINKS.site)}" style="color:#e8d48b;text-decoration:none;">Przelewy24</a> — <a href="${esc(PRZELEWY24_LINKS.regulamin)}" style="color:#c5a059;text-decoration:underline;text-decoration-color:rgba(197,160,89,0.45);">регламент оператора</a>.`
        : `Онлайн-оплата: <a href="${esc(PRZELEWY24_LINKS.site)}" style="color:#e8d48b;text-decoration:none;">Przelewy24</a> — <a href="${esc(PRZELEWY24_LINKS.regulamin)}" style="color:#c5a059;text-decoration:underline;text-decoration-color:rgba(197,160,89,0.45);">регламент оператора</a>.`;
  const contactLine = mail
    ? `${contactLabel} <a href="mailto:${esc(mail)}" style="color:#e8d48b;text-decoration:none;">${esc(mail)}</a><br />`
    : "";

  const base = getPublicAppUrl()?.replace(/\/$/, "");
  const labels = DOC_LINKS[locale];
  let docBlock = "";
  if (base) {
    const termsUrl = `${base}${canonicalPath(locale, "/regulamin")}`;
    const privacyUrl = `${base}${canonicalPath(locale, "/polityka-prywatnosci")}`;
    const returnsUrl = `${base}${canonicalPath(locale, "/zwroty")}`;
    docBlock = `
                <strong style="color:#8a7344;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">${esc(DOC_INTRO[locale])}</strong><br />
                <span style="display:inline-block;margin-top:6px;line-height:1.65;">
                <a href="${esc(termsUrl)}" style="color:#e8d48b;text-decoration:none;">${esc(labels.terms)}</a>
                <span style="color:#5c5754;"> · </span>
                <a href="${esc(privacyUrl)}" style="color:#e8d48b;text-decoration:none;">${esc(labels.privacy)}</a>
                <span style="color:#5c5754;"> · </span>
                <a href="${esc(returnsUrl)}" style="color:#e8d48b;text-decoration:none;">${esc(labels.returns)}</a>
                </span><br />`;
  }

  return `
            <tr>
              <td style="padding-top:22px;border-top:1px solid rgba(197,160,89,0.14);font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:11px;line-height:1.6;color:#6b6560;">
                <strong style="color:#c5a059;">${esc(COMPANY.productName)}</strong><br />
                <span style="color:#9a8f96;">${esc(onlineSuffix)}</span><br />
                <span style="color:#8a8580;">${esc(COMPANY.legalNameShort)}</span><br />
                <span style="font-size:10px;color:#5c5754;">${esc(COMPANY.legalName)}</span><br />
                <span style="color:#7a726c;">NIP: ${esc(COMPANY.nip)} · KRS: ${esc(COMPANY.krs)} · REGON: ${esc(COMPANY.regon)}</span><br />
                <span style="color:#7a726c;">${esc(addr)}</span><br />
                ${contactLine}
                ${docBlock}
                ${paymentsLine}
              </td>
            </tr>`;
}

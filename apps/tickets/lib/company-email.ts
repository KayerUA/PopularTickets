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
      ? `<span style="display:block;margin-top:16px;line-height:1.65;">Płatności internetowe: <a href="${esc(PRZELEWY24_LINKS.site)}" style="color:#e8d48b;font-weight:600;text-decoration:none;">Przelewy24</a> — <a href="${esc(PRZELEWY24_LINKS.regulamin)}" style="color:#c5a059;text-decoration:underline;text-decoration-color:rgba(197,160,89,0.45);">regulamin operatora</a>.</span>`
      : locale === "uk"
        ? `<span style="display:block;margin-top:16px;line-height:1.65;">Онлайн-оплата: <a href="${esc(PRZELEWY24_LINKS.site)}" style="color:#e8d48b;font-weight:600;text-decoration:none;">Przelewy24</a> — <a href="${esc(PRZELEWY24_LINKS.regulamin)}" style="color:#c5a059;text-decoration:underline;text-decoration-color:rgba(197,160,89,0.45);">регламент оператора</a>.</span>`
        : `<span style="display:block;margin-top:16px;line-height:1.65;">Онлайн-оплата: <a href="${esc(PRZELEWY24_LINKS.site)}" style="color:#e8d48b;font-weight:600;text-decoration:none;">Przelewy24</a> — <a href="${esc(PRZELEWY24_LINKS.regulamin)}" style="color:#c5a059;text-decoration:underline;text-decoration-color:rgba(197,160,89,0.45);">регламент оператора</a>.</span>`;
  const contactLine = mail
    ? `<span style="display:block;margin-top:10px;">${contactLabel} <a href="mailto:${esc(mail)}" style="color:#e8d48b;text-decoration:none;">${esc(mail)}</a></span>`
    : "";

  const base = getPublicAppUrl()?.replace(/\/$/, "");
  const labels = DOC_LINKS[locale];
  let docBlock = "";
  if (base) {
    const termsUrl = `${base}${canonicalPath(locale, "/regulamin")}`;
    const privacyUrl = `${base}${canonicalPath(locale, "/polityka-prywatnosci")}`;
    const returnsUrl = `${base}${canonicalPath(locale, "/zwroty")}`;
    docBlock = `
                <span style="display:block;margin-top:18px;">
                <strong style="display:block;margin-bottom:8px;color:#c5a059;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">${esc(DOC_INTRO[locale])}</strong>
                <span style="display:block;line-height:1.75;">
                <a href="${esc(termsUrl)}" style="color:#e8d48b;text-decoration:none;">${esc(labels.terms)}</a>
                <span style="color:#5c5754;"> · </span>
                <a href="${esc(privacyUrl)}" style="color:#e8d48b;text-decoration:none;">${esc(labels.privacy)}</a>
                <span style="color:#5c5754;"> · </span>
                <a href="${esc(returnsUrl)}" style="color:#e8d48b;text-decoration:none;">${esc(labels.returns)}</a>
                </span>
                </span>`;
  }

  return `
            <tr>
              <td style="padding:26px 4px 18px 4px;border-top:1px solid rgba(197,160,89,0.2);font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:11px;line-height:1.6;color:#6b6560;">
                <strong style="font-size:13px;font-weight:700;color:#c5a059;">${esc(COMPANY.productName)}</strong><span style="font-size:12px;color:#9a8f96;"> ${esc(onlineSuffix)}</span><br />
                <span style="display:block;margin-top:12px;line-height:1.55;color:#8a8580;">${esc(COMPANY.legalNameShort)}<br />
                <span style="font-size:10px;letter-spacing:0.03em;color:#5c5754;">${esc(COMPANY.legalName)}</span><br />
                <span style="color:#7a726c;">NIP: ${esc(COMPANY.nip)} · KRS: ${esc(COMPANY.krs)} · REGON: ${esc(COMPANY.regon)}</span><br />
                <span style="color:#7a726c;">${esc(addr)}</span></span>
                ${contactLine}
                ${docBlock}
                ${paymentsLine}
              </td>
            </tr>`;
}

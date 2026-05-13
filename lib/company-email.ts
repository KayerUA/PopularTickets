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
  pl: "Dokumenty dla kupującego:",
  uk: "Документи для покупця:",
  ru: "Документы для покупателя:",
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
      ? `Płatności internetowe: <a href="${esc(PRZELEWY24_LINKS.site)}" style="color:#c5a059;">Przelewy24</a> — <a href="${esc(PRZELEWY24_LINKS.regulamin)}" style="color:#a1a1aa;">regulamin operatora</a>.`
      : locale === "uk"
        ? `Онлайн-оплата: <a href="${esc(PRZELEWY24_LINKS.site)}" style="color:#c5a059;">Przelewy24</a> — <a href="${esc(PRZELEWY24_LINKS.regulamin)}" style="color:#a1a1aa;">регламент оператора</a>.`
        : `Онлайн-оплата: <a href="${esc(PRZELEWY24_LINKS.site)}" style="color:#c5a059;">Przelewy24</a> — <a href="${esc(PRZELEWY24_LINKS.regulamin)}" style="color:#a1a1aa;">регламент оператора</a>.`;
  const contactLine = mail
    ? `${contactLabel} <a href="mailto:${esc(mail)}" style="color:#c5a059;">${esc(mail)}</a><br />`
    : "";

  const base = getPublicAppUrl()?.replace(/\/$/, "");
  const labels = DOC_LINKS[locale];
  let docBlock = "";
  if (base) {
    const termsUrl = `${base}${canonicalPath(locale, "/regulamin")}`;
    const privacyUrl = `${base}${canonicalPath(locale, "/polityka-prywatnosci")}`;
    const returnsUrl = `${base}${canonicalPath(locale, "/zwroty")}`;
    docBlock = `
                <strong style="color:#71717a;">${esc(DOC_INTRO[locale])}</strong><br />
                <a href="${esc(termsUrl)}" style="color:#c5a059;">${esc(labels.terms)}</a>
                · <a href="${esc(privacyUrl)}" style="color:#c5a059;">${esc(labels.privacy)}</a>
                · <a href="${esc(returnsUrl)}" style="color:#c5a059;">${esc(labels.returns)}</a><br />`;
  }

  return `
            <tr>
              <td style="padding-top:24px;border-top:1px solid #27272a;font-family:system-ui,sans-serif;font-size:11px;line-height:1.55;color:#52525e;">
                <strong style="color:#71717a;">${esc(COMPANY.productName)}</strong><br />
                ${esc(onlineSuffix)}<br />
                <span style="color:#71717a;">${esc(COMPANY.legalNameShort)}</span><br />
                <span style="font-size:10px;color:#52525e;">${esc(COMPANY.legalName)}</span><br />
                NIP: ${esc(COMPANY.nip)} · KRS: ${esc(COMPANY.krs)} · REGON: ${esc(COMPANY.regon)}<br />
                ${esc(addr)}<br />
                ${contactLine}
                ${docBlock}
                ${paymentsLine}
              </td>
            </tr>`;
}

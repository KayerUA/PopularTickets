import { companyEmailFooterHtml } from "@/lib/company-email";
import { esc } from "@/lib/email/htmlEscape";
import type { AppLocale } from "@/i18n/routing";

const C = {
  bg: "#0b0609",
  velvet: "#0f080c",
  surface: "#151017",
  surface2: "#1a1218",
  gold: "#c5a059",
  goldBright: "#e8d48b",
  goldDim: "#8a7344",
  text: "#f4f4f5",
  muted: "#a39e96",
  border: "rgba(197,160,89,0.28)",
  borderSoft: "rgba(197,160,89,0.15)",
} as const;

const bodyTableBg =
  `background-color:${C.bg};background-image:radial-gradient(ellipse 100% 70% at 50% -5%, rgba(96,44,58,0.22), transparent 52%),linear-gradient(90deg, rgba(22,6,12,0.52) 0%, transparent 14%, transparent 86%, rgba(22,6,12,0.52) 100%),repeating-linear-gradient(90deg, #080506 0px, #160d12 44px, #080506 88px, #120c10 112px, #080506 132px, #160d12 176px, #080506 220px),linear-gradient(192deg, #1a0f16 0%, ${C.velvet} 46%, #060304 100%);background-repeat:no-repeat,no-repeat,repeat,no-repeat;background-size:100% 100%,100% 100%,auto,100% 100%;`;

export const newsletterBoeingCopy = {
  ru: {
    kicker: "Popular Poet · афиша",
    subject: "«Боинг-Боинг» — 4 октября, Scena Kocjana",
    heading: "«Боинг-Боинг»",
    lead: "Первый показ собрал полный зал. 4 октября играем снова — в Scena Kocjana на Bemowo: настоящая сцена и большое пространство.",
    perks: [
      "Поднятая сцена 9×7 м и большой зал",
      "Кресла амфитеатром — видно с любого ряда",
      "Профессиональный свет, звук, кондиционер",
      "Фойе, ресторан рядом, парковка на ~200 машин",
    ],
    cta: "Купить билет за {price}",
    instead: "вместо",
    optout: "Если такие письма больше не нужны — просто ответьте.",
  },
  pl: {
    kicker: "Popular Poet · afisz",
    subject: "„Boeing-Boeing” — 4 października, Scena Kocjana",
    heading: "„Boeing-Boeing”",
    lead: "Pierwszy pokaz zagrał przy pełnej sali. 4 października gramy znowu — w Scena Kocjana na Bemowie: prawdziwa scena i duża przestrzeń.",
    perks: [
      "Podniesiona scena 9×7 m i duża sala",
      "Fotele amfiteatralnie — widać z każdego rzędu",
      "Profesjonalne światło, dźwięk, klimatyzacja",
      "Foyer, restauracja obok, parking na ok. 200 aut",
    ],
    cta: "Kup bilet za {price}",
    instead: "zamiast",
    optout: "Jeśli nie chcesz takich listów — po prostu odpisz.",
  },
  uk: {
    kicker: "Popular Poet · афіша",
    subject: "«Боїнг-Боїнг» — 4 жовтня, Scena Kocjana",
    heading: "«Боїнг-Боїнг»",
    lead: "Перший показ зібрав повну залу. 4 жовтня граємо знову — у Scena Kocjana на Bemowo: справжня сцена і великий простір.",
    perks: [
      "Піднята сцена 9×7 м і велика зала",
      "Крісла амфітеатром — видно з будь-якого ряду",
      "Професійне світло, звук, кондиціонер",
      "Фоє, ресторан поруч, парковка на ~200 авто",
    ],
    cta: "Купити квиток за {price}",
    instead: "замість",
    optout: "Якщо такі листи більше не потрібні — просто дайте відповідь.",
  },
} as const;

export type NewsletterBoeingEvent = {
  locale: AppLocale;
  whenLabel: string;
  venue: string;
  priceLabel: string;
  regularPriceLabel: string;
  imageUrl: string;
  url: string;
};

export function newsletterBoeingEmailHtml(event: NewsletterBoeingEvent): string {
  const t = newsletterBoeingCopy[event.locale];
  const perks = t.perks
    .map(
      (perk) => `
                          <tr>
                            <td style="padding:0 0 8px 0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.45;color:${C.muted};">
                              <span style="display:inline-block;width:8px;height:8px;border-radius:99px;background:${C.gold};margin-right:10px;vertical-align:middle;"></span>
                              <span style="vertical-align:middle;">${esc(perk)}</span>
                            </td>
                          </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${event.locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
  </head>
  <body style="margin:0;padding:0;background:${C.bg};">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${bodyTableBg}">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="border-radius:22px;border:1px solid ${C.border};background-color:${C.surface};background-image:linear-gradient(180deg, ${C.surface2} 0%, ${C.surface} 22%, ${C.surface} 100%);box-shadow:0 24px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(232,212,139,0.06);overflow:hidden;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:0;line-height:0;font-size:0;">
                      <img src="${esc(event.imageUrl)}" alt="${esc(t.heading)}" width="580" style="display:block;width:100%;max-width:580px;height:auto;border:0;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:26px 28px 8px 28px;font-family:Georgia,'Times New Roman',serif;">
                      <p style="margin:0 0 6px 0;font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${C.goldDim};font-family:system-ui,-apple-system,sans-serif;">
                        ${esc(t.kicker)}
                      </p>
                      <h1 style="margin:0;font-size:28px;font-weight:600;line-height:1.2;color:${C.goldBright};letter-spacing:-0.02em;">
                        ${esc(t.heading)}
                      </h1>
                      <table width="72" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;">
                        <tr>
                          <td style="height:3px;border-radius:2px;background:linear-gradient(90deg,${C.goldDim},${C.goldBright},${C.gold});font-size:0;line-height:0;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 28px 6px 28px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
                      <span style="display:block;color:${C.goldBright};font-size:16px;font-weight:600;">${esc(event.whenLabel)}</span>
                      <span style="display:block;margin-top:4px;color:${C.muted};font-size:14px;">${esc(event.venue)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 28px 8px 28px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${C.text};font-size:15px;line-height:1.65;">
                      ${esc(t.lead)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 28px 6px 28px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${perks}</table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 28px 6px 28px;font-family:Georgia,'Times New Roman',serif;">
                      <span style="font-size:32px;font-weight:600;color:${C.goldBright};letter-spacing:-0.03em;">${esc(event.priceLabel)}</span>
                      <span style="margin-left:10px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;color:#6b6560;">${esc(t.instead)} <s style="color:#a39e96;">${esc(event.regularPriceLabel)}</s></span>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:14px 28px 10px 28px;">
                      <a href="${esc(event.url)}" style="display:inline-block;background:${C.gold};color:#1a120c;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.04em;text-decoration:none;padding:14px 32px;border-radius:999px;">
                        ${esc(t.cta.replace("{price}", event.priceLabel))}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 28px 18px 28px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:12px;line-height:1.5;color:#6b6560;text-align:center;">
                      ${esc(t.optout)}
                    </td>
                  </tr>
                  ${companyEmailFooterHtml(event.locale)}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function newsletterBoeingEmailText(event: NewsletterBoeingEvent): string {
  const t = newsletterBoeingCopy[event.locale];
  return [
    t.heading,
    event.whenLabel,
    event.venue,
    "",
    t.lead,
    "",
    ...t.perks.map((perk) => `• ${perk}`),
    "",
    event.priceLabel,
    `${t.instead} ${event.regularPriceLabel}`,
    event.url,
    "",
    t.optout,
  ].join("\n");
}

export function newsletterBoeingEmailSubject(locale: AppLocale): string {
  return newsletterBoeingCopy[locale].subject;
}

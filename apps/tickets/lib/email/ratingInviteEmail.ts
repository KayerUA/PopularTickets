import { companyEmailFooterHtml } from "@/lib/company-email";
import { esc } from "@/lib/email/htmlEscape";
import type { AppLocale } from "@/i18n/routing";
import { ratingText } from "@/lib/ratings/i18n";

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

export type RatingInviteEvent = {
  title: string;
  whenLabel: string;
  url: string;
};

function heading(locale: AppLocale, many: boolean): string {
  const t = ratingText[locale];
  return many ? `${t.emailSubjectMany}?` : t.title;
}

function eventBlock(event: RatingInviteEvent, buttonLabel: string): string {
  return `
                  <tr>
                    <td style="padding:0 28px 22px 28px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;border-spacing:0;border:1px solid ${C.borderSoft};border-radius:16px;background:rgba(197,160,89,0.06);">
                        <tr>
                          <td style="padding:16px 18px 8px 18px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
                            <span style="display:block;color:${C.goldBright};font-weight:600;font-size:16px;line-height:1.35;">${esc(event.title)}</span>
                            <span style="display:block;margin-top:6px;color:${C.muted};font-size:14px;">${esc(event.whenLabel)}</span>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:8px 18px 18px 18px;">
                            <a href="${esc(event.url)}" style="display:inline-block;background:${C.gold};color:#1a120c;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.04em;text-decoration:none;padding:12px 24px;border-radius:999px;">
                              ${esc(buttonLabel)}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>`;
}

export function ratingInviteEmailHtml(params: {
  locale: AppLocale;
  events: RatingInviteEvent[];
}): string {
  const t = ratingText[params.locale];
  const events = params.events.filter((event) => event.url && event.title);
  const many = events.length > 1;
  const kicker = params.locale === "pl" ? "Popular Poet · bilety" : params.locale === "uk" ? "Popular Poet · квитки" : "Popular Poet · билеты";
  const eventRows = events.map((event) => eventBlock(event, t.link)).join("");

  return `<!DOCTYPE html>
<html lang="${params.locale}">
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
                    <td style="padding:26px 28px 8px 28px;font-family:Georgia,'Times New Roman',serif;">
                      <p style="margin:0 0 6px 0;font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${C.goldDim};font-family:system-ui,-apple-system,sans-serif;">
                        ${esc(kicker)}
                      </p>
                      <h1 style="margin:0;font-size:26px;font-weight:600;line-height:1.2;color:${C.goldBright};letter-spacing:-0.02em;">
                        ${esc(heading(params.locale, many))}
                      </h1>
                      <table width="72" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;">
                        <tr>
                          <td style="height:3px;border-radius:2px;background:linear-gradient(90deg,${C.goldDim},${C.goldBright},${C.gold});font-size:0;line-height:0;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 28px 18px 28px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${C.text};font-size:15px;line-height:1.65;">
                      ${esc(many ? t.emailBodyMany : t.emailBody)}
                    </td>
                  </tr>
                  ${eventRows}
                  ${companyEmailFooterHtml(params.locale)}
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

export function ratingInviteEmailText(params: {
  locale: AppLocale;
  events: RatingInviteEvent[];
}): string {
  const t = ratingText[params.locale];
  const events = params.events.filter((event) => event.url && event.title);
  const many = events.length > 1;
  const lines = events.map((event) => `${event.title}\n${event.whenLabel}\n${event.url}`);
  return `${heading(params.locale, many)}\n\n${many ? t.emailBodyMany : t.emailBody}\n\n${lines.join("\n\n")}`;
}

export function ratingInviteEmailSubject(params: { locale: AppLocale; events: RatingInviteEvent[] }): string {
  const t = ratingText[params.locale];
  const events = params.events.filter((event) => event.title);
  if (events.length > 1) return t.emailSubjectMany;
  const title = events[0]?.title;
  return title ? `${t.emailSubject} — ${title}` : t.emailSubject;
}

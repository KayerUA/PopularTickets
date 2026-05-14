import { companyEmailFooterHtml } from "@/lib/company-email";
import { ticketEmailStrings } from "@/lib/email/ticketEmailI18n";
import type { AppLocale } from "@/i18n/routing";

/** Палитра как на сайте (globals.css) — только hex/rgba для почтовых клиентов. */
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
  dim: "#6b6560",
  border: "rgba(197,160,89,0.28)",
  borderSoft: "rgba(197,160,89,0.15)",
} as const;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Фон «сцена + кулиса» (компактная строка для атрибута style). */
const bodyTableBg =
  `background-color:${C.bg};background-image:radial-gradient(ellipse 100% 70% at 50% -5%, rgba(96,44,58,0.22), transparent 52%),linear-gradient(90deg, rgba(22,6,12,0.52) 0%, transparent 14%, transparent 86%, rgba(22,6,12,0.52) 100%),repeating-linear-gradient(90deg, #080506 0px, #160d12 44px, #080506 88px, #120c10 112px, #080506 132px, #160d12 176px, #080506 220px),linear-gradient(192deg, #1a0f16 0%, ${C.velvet} 46%, #060304 100%);background-repeat:no-repeat,no-repeat,repeat,no-repeat;background-size:100% 100%,100% 100%,auto,100% 100%;`;

const curtainOverlay =
  `opacity:0.55;background-image:radial-gradient(ellipse 120% 75% at 50% 100%, rgba(48,14,26,0.12), transparent 52%),linear-gradient(90deg, rgba(22,6,12,0.38) 0%, transparent 14%, transparent 86%, rgba(22,6,12,0.38) 100%),repeating-linear-gradient(90deg, transparent 0, transparent 42px, rgba(32,10,18,0.14) 48px, rgba(18,4,10,0.18) 54px, rgba(32,10,18,0.14) 60px, transparent 66px, transparent 112px);`;

const brandKicker = (locale: AppLocale): string => {
  if (locale === "pl") return "Popular Poet · bilety";
  if (locale === "uk") return "Popular Poet · квитки";
  return "Popular Poet · билеты";
};

export function ticketEmailHtml(params: {
  eventTitle: string;
  venue: string;
  startsAt: string;
  tickets: { id: string; ticketNumber: string }[];
  locale: AppLocale;
}): string {
  const str = ticketEmailStrings(params.locale);
  const rows = params.tickets
    .map(
      (t) => `
      <tr>
        <td style="padding:14px 12px;border-bottom:1px solid ${C.borderSoft};font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${C.text};font-size:15px;">
          <strong style="color:${C.goldBright};letter-spacing:0.02em;">${esc(t.ticketNumber)}</strong>
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid ${C.borderSoft};font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:13px;color:${C.muted};line-height:1.45;">
          ${esc(str.colAttachment)}
        </td>
      </tr>`
    )
    .join("");

  const kicker = brandKicker(params.locale);

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
          <!-- лёгкий слой «занавес» поверх складок -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;">
            <tr>
              <td style="height:10px;line-height:10px;font-size:0;${curtainOverlay}">&nbsp;</td>
            </tr>
          </table>
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
                        ${esc(params.eventTitle)}
                      </h1>
                      <table width="72" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;">
                        <tr>
                          <td style="height:3px;border-radius:2px;background:linear-gradient(90deg,${C.goldDim},${C.goldBright},${C.gold});font-size:0;line-height:0;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 28px 20px 28px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${C.muted};font-size:15px;line-height:1.6;">
                      <span style="display:block;color:${C.muted};">${esc(params.venue)}</span>
                      <span style="display:block;margin-top:8px;font-size:16px;font-weight:600;color:${C.goldBright};">${esc(params.startsAt)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 28px 22px 28px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${C.text};font-size:15px;line-height:1.65;border-top:1px solid ${C.borderSoft};">
                      ${esc(str.intro)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 22px 14px 22px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border-radius:16px;border:1px solid ${C.borderSoft};overflow:hidden;">
                        <thead>
                          <tr style="background:rgba(8,5,6,0.65);">
                            <th align="left" style="padding:13px 16px;font-family:system-ui,-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${C.gold};border-bottom:1px solid ${C.borderSoft};">
                              ${esc(str.colTicket)}
                            </th>
                            <th align="left" style="padding:13px 16px;font-family:system-ui,-apple-system,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${C.gold};border-bottom:1px solid ${C.borderSoft};">
                              ${esc(str.attachmentColumnTitle)}
                            </th>
                          </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 24px 24px 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;border-spacing:0;background:rgba(197,160,89,0.07);border:1px solid rgba(197,160,89,0.2);border-radius:14px;border-left:3px solid ${C.gold};">
                        <tr>
                          <td style="padding:15px 18px 8px 20px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.6;color:#c9c4bc;">
                            ${esc(str.backupIdNote)}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 18px 16px 20px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:12px;line-height:1.55;color:#8a8580;">
                            ${esc(str.vatConsumerNote)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 28px 20px 28px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:12px;color:${C.dim};letter-spacing:0.04em;text-align:center;line-height:1.5;">
                      ${esc(str.tagline)}
                    </td>
                  </tr>
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

import { esc } from "@/lib/email/htmlEscape";

const C = {
  gold: "#c5a059",
  goldBright: "#e8d48b",
  goldDim: "#8a7344",
  text: "#f4f4f5",
  muted: "#a39e96",
  dim: "#6b6560",
  ticketBg: "#0c0709",
  stubBg: "#180a0e",
  controlBg: "#120709",
  ripBg: "#080506",
  border: "rgba(197,160,89,0.55)",
  borderSoft: "rgba(197,160,89,0.35)",
} as const;

export type EmailTicketCardLabels = {
  ticketLabel: string;
  ticketRibbon: string;
  stubControl: string;
};

export type EmailTicketCardInput = {
  ticketNumber: string;
  ticketId: string;
  /** cid:… для inline QR (Gmail не показывает data: URL) */
  qrImageSrc: string;
  attachmentLabel: string;
};

/** Горизонтальный билет (table layout) — как CheckoutPaidReceipt / PDF. */
export function renderEmailTicketCardHtml(ticket: EmailTicketCardInput, labels: EmailTicketCardLabels): string {
  const stubLetters = labels.stubControl
    .trim()
    .toUpperCase()
    .split("")
    .map((ch) => esc(ch))
    .join("<br />");

  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;border-spacing:0;margin:0 0 16px 0;border:2px solid ${C.border};border-radius:10px;overflow:hidden;background:${C.ticketBg};">
  <tr>
    <td width="28%" valign="top" style="padding:14px 10px 14px 12px;background:linear-gradient(180deg,#2a1218 0%,#180a0e 55%,#0a0507 100%);border-right:2px dashed ${C.borderSoft};">
      <p style="margin:0 0 8px 0;font-family:system-ui,-apple-system,sans-serif;font-size:8px;font-weight:700;letter-spacing:0.32em;text-transform:uppercase;color:${C.gold};">
        ${esc(labels.ticketLabel.toUpperCase())}
      </p>
      <p style="margin:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;line-height:1.15;letter-spacing:0.04em;color:${C.goldBright};word-break:break-word;">
        ${esc(ticket.ticketNumber)}
      </p>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:${C.goldDim};">
        ${esc(labels.ticketRibbon.toUpperCase())}
      </p>
    </td>
    <td width="52%" align="center" valign="middle" style="padding:16px 12px;background:linear-gradient(180deg,#0f090b 0%,#0c0709 100%);border-right:2px dashed ${C.borderSoft};">
      <img src="${ticket.qrImageSrc}" width="168" height="168" alt="" style="display:block;margin:0 auto 10px auto;border:2px solid ${C.border};border-radius:6px;background:#fff;padding:6px;" />
      <p style="margin:0 0 6px 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;line-height:1.45;color:${C.dim};word-break:break-all;text-align:center;">
        ${esc(ticket.ticketId)}
      </p>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:11px;line-height:1.4;color:${C.muted};text-align:center;">
        ${esc(ticket.attachmentLabel)}
      </p>
    </td>
    <td width="20%" align="center" valign="middle" style="padding:10px 6px;background:linear-gradient(180deg,#1c0c10 0%,#120709 50%,#000 100%);">
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;line-height:1.05;letter-spacing:0.18em;text-transform:uppercase;color:${C.goldBright};text-align:center;">
        ${stubLetters}
      </p>
    </td>
  </tr>
</table>`;
}

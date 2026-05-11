import { companyEmailFooterHtml } from "@/lib/company-email";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ticketEmailHtml(params: {
  eventTitle: string;
  venue: string;
  startsAt: string;
  tickets: { id: string; ticketNumber: string }[];
}): string {
  const rows = params.tickets
    .map(
      (t) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #27272a;font-family:system-ui,sans-serif;color:#e4e4e7;">
          <strong>${esc(t.ticketNumber)}</strong>
        </td>
        <td style="padding:12px;border-bottom:1px solid #27272a;font-family:ui-monospace,monospace;font-size:12px;color:#a1a1aa;">
          ${esc(t.id)}
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;background:#09090b;padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#18181b;border-radius:16px;padding:28px;border:1px solid #27272a;">
            <tr>
              <td style="font-family:system-ui,sans-serif;color:#fafafa;font-size:22px;font-weight:600;padding-bottom:8px;">
                ${esc(params.eventTitle)}
              </td>
            </tr>
            <tr>
              <td style="font-family:system-ui,sans-serif;color:#a1a1aa;font-size:14px;padding-bottom:20px;">
                ${esc(params.venue)} · ${esc(params.startsAt)}
              </td>
            </tr>
            <tr>
              <td style="font-family:system-ui,sans-serif;color:#e4e4e7;font-size:14px;padding-bottom:12px;">
                В приложении — QR-коды для каждого билета. На входе покажите соответствующий QR.
              </td>
            </tr>
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th align="left" style="padding:8px 12px;font-family:system-ui,sans-serif;font-size:12px;color:#71717a;text-transform:uppercase;">Номер</th>
                      <th align="left" style="padding:8px 12px;font-family:system-ui,sans-serif;font-size:12px;color:#71717a;text-transform:uppercase;">ID билета</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:20px;font-family:system-ui,sans-serif;font-size:12px;color:#52525e;">
                PopularTickets · мероприятия в Польше
              </td>
            </tr>
            ${companyEmailFooterHtml()}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

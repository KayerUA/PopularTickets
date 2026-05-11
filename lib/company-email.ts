import { COMPANY, companyAddressOneLine, publicContactEmail } from "@/lib/company";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Krótki blok z danymi operatora w stopce maila (HTML). */
export function companyEmailFooterHtml(): string {
  const addr = companyAddressOneLine();
  const mail = publicContactEmail();
  const contactLine = mail
    ? `Kontakt: <a href="mailto:${esc(mail)}" style="color:#c5a059;">${esc(mail)}</a><br />`
    : "";
  return `
            <tr>
              <td style="padding-top:24px;border-top:1px solid #27272a;font-family:system-ui,sans-serif;font-size:11px;line-height:1.5;color:#52525e;">
                <strong style="color:#71717a;">${esc(COMPANY.productName)}</strong>
                — bilety online.<br />
                ${esc(COMPANY.legalNameShort)}<br />
                NIP: ${esc(COMPANY.nip)} · KRS: ${esc(COMPANY.krs)}<br />
                ${esc(addr)}<br />
                ${contactLine}
                Płatności: Przelewy24.
              </td>
            </tr>`;
}

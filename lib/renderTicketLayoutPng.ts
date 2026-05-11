import sharp from "sharp";
import { COMPANY } from "@/lib/company";
import { getTicketSvgEmbeddedFontStyle } from "@/lib/ticketPngFontFaces";

/** Sharp/librsvg на сервере не знает ui-* шрифты — только встроенный Noto Sans (см. ticketPngFontFaces). */
const FONT = "Noto Sans, DejaVu Sans, Liberation Sans, sans-serif";

export type TicketLayoutPngInput = {
  /** `data:image/png;base64,...` — тот же QR, что на странице */
  qrPngDataUrl: string;
  eventTitle: string;
  venue: string;
  dateTimeLabel: string;
  ticketNumber: string;
  ticketId: string;
  /** Короткая подпись на макете (локализованная), напр. «Bilet elektroniczny» */
  kindLabel: string;
  /** Подсказка под UUID (локализованная) */
  qrHint: string;
};

function escapeXmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeXmlAttr(s: string): string {
  return escapeXmlText(s).replace(/"/g, "&quot;");
}

function wrapLines(text: string, maxLen: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (out.length >= maxLines) break;
    if (w.length > maxLen) {
      if (cur) {
        out.push(cur);
        cur = "";
        if (out.length >= maxLines) break;
      }
      out.push(`${w.slice(0, maxLen - 1)}…`);
      continue;
    }
    const trial = cur ? `${cur} ${w}` : w;
    if (trial.length <= maxLen) cur = trial;
    else {
      if (cur) out.push(cur);
      cur = w;
    }
  }
  if (cur && out.length < maxLines) out.push(cur);
  return out;
}

const W = 540;
const H = 900;
const QR = 260;
const QR_X = (W - QR) / 2;
const TITLE_LH = 28;
const VENUE_LH = 22;

export async function renderTicketLayoutPng(input: TicketLayoutPngInput): Promise<Buffer> {
  const brand = COMPANY.productName;
  const titleLines = wrapLines(input.eventTitle, 26, 4);
  const venueLines = wrapLines(input.venue, 32, 2);

  const titleTspans = titleLines
    .map((line, i) => `<tspan x="36" dy="${i === 0 ? 0 : TITLE_LH}">${escapeXmlText(line)}</tspan>`)
    .join("");

  const venueTspans = venueLines
    .map((line, i) => `<tspan x="36" dy="${i === 0 ? 0 : VENUE_LH}">${escapeXmlText(line)}</tspan>`)
    .join("");

  const idShort =
    input.ticketId.length > 36
      ? `${input.ticketId.slice(0, 8)}…${input.ticketId.slice(-8)}`
      : input.ticketId;

  const titleBaseline = 108;
  const afterTitle = titleBaseline + titleLines.length * TITLE_LH + 14;
  const afterVenue = afterTitle + venueLines.length * VENUE_LH + 18;
  const whenY = afterVenue;
  const ticketNumY = whenY + 30;
  const qrPad = 12;
  const qrInnerY = ticketNumY + 36;
  const qrOuterY = qrInnerY - qrPad;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${getTicketSvgEmbeddedFontStyle()}
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#12100e"/>
      <stop offset="100%" style="stop-color:#0a0908"/>
    </linearGradient>
    <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#8a7344"/>
      <stop offset="40%" style="stop-color:#e8d48b"/>
      <stop offset="100%" style="stop-color:#c5a059"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="14" fill="none" stroke="#c5a059" stroke-opacity="0.45" stroke-width="2"/>
  <rect x="26" y="26" width="${W - 52}" height="${H - 52}" rx="10" fill="none" stroke="#c5a059" stroke-opacity="0.12" stroke-width="1"/>
  <path d="M 36 52 Q ${W / 2} 68 ${W - 36} 52" fill="none" stroke="url(#goldLine)" stroke-width="1.5" stroke-opacity="0.7"/>
  <text x="36" y="44" font-family="${FONT}" font-size="13" letter-spacing="0.2em" fill="#8a7344" font-weight="600">${escapeXmlText(brand.toUpperCase())}</text>
  <text x="36" y="78" font-family="${FONT}" font-size="11" letter-spacing="0.25em" fill="#a89a6e" font-weight="500">${escapeXmlText(input.kindLabel.toUpperCase())}</text>
  <text x="36" y="${titleBaseline}" font-family="${FONT}" font-size="24" fill="#e8d48b" font-weight="600">${titleTspans}</text>
  <text x="36" y="${afterTitle}" font-family="${FONT}" font-size="15" fill="#a1a1aa" font-weight="400">${venueTspans}</text>
  <text x="36" y="${whenY}" font-family="${FONT}" font-size="15" fill="#d4d4d8" font-weight="400">${escapeXmlText(input.dateTimeLabel)}</text>
  <text x="36" y="${ticketNumY}" font-family="${FONT}" font-size="19" fill="#e8d48b" font-weight="600" font-variant="tabular-nums">${escapeXmlText(input.ticketNumber)}</text>
  <rect x="${QR_X - qrPad}" y="${qrOuterY}" width="${QR + 2 * qrPad}" height="${QR + 2 * qrPad}" rx="12" fill="#fafafa" stroke="#c5a059" stroke-opacity="0.35" stroke-width="1"/>
  <image href="${escapeXmlAttr(input.qrPngDataUrl)}" xlink:href="${escapeXmlAttr(input.qrPngDataUrl)}" x="${QR_X}" y="${qrInnerY}" width="${QR}" height="${QR}" preserveAspectRatio="xMidYMid meet"/>
  <text x="${W / 2}" y="${H - 52}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="#71717a" font-weight="400" font-variant="tabular-nums">${escapeXmlText(idShort)}</text>
  <text x="${W / 2}" y="${H - 28}" text-anchor="middle" font-family="${FONT}" font-size="9" fill="#52525b" font-weight="400">${escapeXmlText(input.qrHint)}</text>
</svg>`;

  return sharp(Buffer.from(svg, "utf8"), { density: 192 })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

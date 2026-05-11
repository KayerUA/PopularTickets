import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";
import { COMPANY, companyFooterShort } from "@/lib/company";
import { TICKET_PDF_KIND_PL, TICKET_PDF_QR_HINT_PL } from "@/lib/ticketPdfLegalPl";

export type TicketLayoutDocInput = {
  /** `data:image/png;base64,...` — QR как на странице */
  qrPngDataUrl: string;
  eventTitle: string;
  venue: string;
  dateTimeLabel: string;
  ticketNumber: string;
  ticketId: string;
  /** Мелкий перевод подписи вида билета (пусто для PL). */
  ticketKindSecondary: string;
  ticketQrSecondary: string;
  ticketDisclaimer: string;
};

const GOLD = rgb(0.91, 0.83, 0.55);
const GOLD_BRIGHT = rgb(0.95, 0.88, 0.62);
const GOLD_MUTED = rgb(0.55, 0.45, 0.28);
const TEXT = rgb(0.82, 0.82, 0.85);
const TEXT_DIM = rgb(0.45, 0.45, 0.48);
const BG = rgb(0.055, 0.048, 0.042);
const BG_HEADER = rgb(0.078, 0.068, 0.058);

function isJpegBytes(buf: Uint8Array): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/** Логотип может быть JPEG с расширением .png (pdf-lib различает по сигнатуре). */
async function embedLogoImage(pdfDoc: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
  if (isJpegBytes(bytes)) return pdfDoc.embedJpg(bytes);
  return pdfDoc.embedPng(bytes);
}

function dataUrlPngToBytes(dataUrl: string): Uint8Array {
  const m = /^data:image\/png;base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) throw new Error("ticket pdf: ожидается data:image/png;base64,…");
  return Uint8Array.from(Buffer.from(m[1], "base64"));
}

function dejavuPath(file: "DejaVuSans.ttf" | "DejaVuSans-Bold.ttf"): string {
  return path.join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf", file);
}

/** Логотип для PDF (fs — нужен outputFileTracingIncludes на Vercel). */
function loadBrandLogoPngBytes(): Buffer | null {
  const candidates = [
    path.join(process.cwd(), "public/brand/popular-poet-logo.png"),
    path.join(process.cwd(), "app/icon.png"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    } catch {
      /* ignore */
    }
  }
  return null;
}

function wrapForWidth(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  const pushCur = () => {
    if (cur) {
      lines.push(cur);
      cur = "";
    }
  };
  for (const w of words) {
    if (lines.length >= maxLines) break;
    const trial = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      cur = trial;
      continue;
    }
    if (cur) {
      pushCur();
      if (lines.length >= maxLines) break;
    }
    if (font.widthOfTextAtSize(w, size) <= maxWidth) {
      cur = w;
      continue;
    }
    let rest = w;
    while (rest.length > 0 && lines.length < maxLines) {
      let lo = 1;
      let hi = rest.length;
      let fit = 1;
      while (lo <= hi) {
        const mid = Math.ceil((lo + hi) / 2);
        const slice = rest.slice(0, mid) + (mid < rest.length ? "…" : "");
        if (font.widthOfTextAtSize(slice, size) <= maxWidth) {
          fit = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      fit = Math.max(1, fit);
      lines.push(rest.slice(0, fit) + (fit < rest.length ? "…" : ""));
      rest = rest.slice(fit);
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function drawCenteredBlock(
  page: PDFPage,
  pageW: number,
  lines: string[],
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  startBaseline: number,
  lineGap: number
): number {
  let baseline = startBaseline;
  for (const line of lines) {
    const w = font.widthOfTextAtSize(line, size);
    page.drawText(line, { x: (pageW - w) / 2, y: baseline, size, font, color });
    baseline -= lineGap;
  }
  return baseline;
}

/** Декоративные уголки (тонкая «рамка»). */
function drawCornerFrames(page: PDFPage, W: number, H: number, inset: number, arm: number, color: ReturnType<typeof rgb>, thickness: number) {
  const t = thickness;
  // нижний-left в PDF: (inset, inset)
  page.drawLine({ start: { x: inset, y: inset }, end: { x: inset + arm, y: inset }, thickness: t, color });
  page.drawLine({ start: { x: inset, y: inset }, end: { x: inset, y: inset + arm }, thickness: t, color });
  page.drawLine({ start: { x: W - inset, y: inset }, end: { x: W - inset - arm, y: inset }, thickness: t, color });
  page.drawLine({ start: { x: W - inset, y: inset }, end: { x: W - inset, y: inset + arm }, thickness: t, color });
  page.drawLine({ start: { x: inset, y: H - inset }, end: { x: inset + arm, y: H - inset }, thickness: t, color });
  page.drawLine({ start: { x: inset, y: H - inset }, end: { x: inset, y: H - inset - arm }, thickness: t, color });
  page.drawLine({ start: { x: W - inset, y: H - inset }, end: { x: W - inset - arm, y: H - inset }, thickness: t, color });
  page.drawLine({ start: { x: W - inset, y: H - inset }, end: { x: W - inset, y: H - inset - arm }, thickness: t, color });
}

/** PDF-билет: шапка с логотипом, золотая сетка, футер оператора. */
export async function renderTicketLayoutPdf(input: TicketLayoutDocInput): Promise<Buffer> {
  const regularBytes = fs.readFileSync(dejavuPath("DejaVuSans.ttf"));
  const boldBytes = fs.readFileSync(dejavuPath("DejaVuSans-Bold.ttf"));

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(regularBytes, { subset: true });
  const fontBold = await pdfDoc.embedFont(boldBytes, { subset: true });

  const W = 280;
  const H = 520;
  const margin = 18;
  const contentW = W - 2 * margin;
  const headerH = 48;

  const page = pdfDoc.addPage([W, H]);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG });
  page.drawRectangle({
    x: 0,
    y: H * 0.42,
    width: W,
    height: H * 0.58,
    color: rgb(0.04, 0.035, 0.03),
    opacity: 0.35,
  });

  page.drawRectangle({
    x: 10,
    y: 10,
    width: W - 20,
    height: H - 20,
    borderColor: GOLD_MUTED,
    borderWidth: 0.85,
  });
  page.drawRectangle({
    x: 14,
    y: 14,
    width: W - 28,
    height: H - 28,
    borderColor: rgb(0.78, 0.63, 0.35),
    borderOpacity: 0.35,
    borderWidth: 0.55,
  });
  drawCornerFrames(page, W, H, 18, 22, GOLD_BRIGHT, 0.9);

  page.drawRectangle({ x: 0, y: H - headerH, width: W, height: headerH, color: BG_HEADER });
  page.drawLine({
    start: { x: 0, y: H - headerH },
    end: { x: W, y: H - headerH },
    thickness: 1.1,
    color: rgb(0.72, 0.58, 0.32),
  });

  const logoH = 36;
  let textLeft = margin + 4;
  const logoBuf = loadBrandLogoPngBytes();
  if (logoBuf) {
    try {
      const logoImg = await embedLogoImage(pdfDoc, new Uint8Array(logoBuf));
      const scale = logoH / logoImg.height;
      const logoW = logoImg.width * scale;
      const logoY = H - headerH + (headerH - logoH) / 2;
      page.drawImage(logoImg, { x: margin + 2, y: logoY, width: logoW, height: logoH });
      textLeft = margin + 6 + logoW + 8;
    } catch (e) {
      console.warn("[renderTicketLayoutPdf] логотип не встроен:", e);
    }
  }

  const brand = COMPANY.productName.toUpperCase();
  const brandSize = 11;
  const brandBaseline = H - headerH / 2 + brandSize * 0.35;
  page.drawText(brand, {
    x: textLeft,
    y: brandBaseline,
    size: brandSize,
    font: fontBold,
    color: GOLD_BRIGHT,
  });
  const sub = COMPANY.legalNameShort;
  const subSize = 5.8;
  page.drawText(sub, {
    x: textLeft,
    y: brandBaseline - subSize * 1.35,
    size: subSize,
    font,
    color: rgb(0.62, 0.58, 0.52),
  });

  let y = H - headerH - 14;

  page.drawLine({
    start: { x: margin, y: y + 4 },
    end: { x: W - margin, y: y + 4 },
    thickness: 0.35,
    color: GOLD_MUTED,
    opacity: 0.6,
  });
  y -= 6;

  page.drawText(TICKET_PDF_KIND_PL.toUpperCase(), {
    x: margin,
    y: y - 7,
    size: 6.8,
    font: fontBold,
    color: rgb(0.72, 0.62, 0.42),
  });
  y -= 12;

  const kindSec = input.ticketKindSecondary.trim();
  if (kindSec) {
    const secLines = wrapForWidth(kindSec, font, 5.2, contentW, 2);
    for (const line of secLines) {
      page.drawText(line, { x: margin, y: y - 2, size: 5.2, font, color: rgb(0.52, 0.5, 0.46) });
      y -= 6.8;
    }
    y -= 3;
  }

  const titleLines = wrapForWidth(input.eventTitle, fontBold, 13, contentW, 4);
  for (const line of titleLines) {
    page.drawText(line, { x: margin, y: y - 12, size: 13, font: fontBold, color: GOLD });
    y -= 15;
  }
  y -= 5;

  const venueLines = wrapForWidth(input.venue, font, 9, contentW, 2);
  for (const line of venueLines) {
    page.drawText(line, { x: margin, y: y - 9, size: 9, font, color: TEXT });
    y -= 11.5;
  }
  y -= 5;

  page.drawText(input.dateTimeLabel, { x: margin, y: y - 9, size: 9, font, color: rgb(0.88, 0.86, 0.9) });
  y -= 14;

  page.drawText("NUMER BILETU", {
    x: margin,
    y: y - 6,
    size: 5.5,
    font: fontBold,
    color: GOLD_MUTED,
  });
  y -= 9;
  page.drawText(input.ticketNumber, { x: margin, y: y - 11, size: 12.5, font: fontBold, color: GOLD_BRIGHT });
  y -= 20;

  const qrBytes = dataUrlPngToBytes(input.qrPngDataUrl);
  const qrImg = await pdfDoc.embedPng(qrBytes);
  const qrSize = 108;
  const qrPad = 8;
  const qrX = (W - qrSize) / 2;
  const qrBoxY = y - qrSize - qrPad;
  page.drawRectangle({
    x: qrX - qrPad,
    y: qrBoxY,
    width: qrSize + 2 * qrPad,
    height: qrSize + 2 * qrPad,
    color: rgb(0.99, 0.99, 0.99),
    borderColor: rgb(0.72, 0.58, 0.32),
    borderWidth: 0.75,
  });
  page.drawImage(qrImg, { x: qrX, y: y - qrSize, width: qrSize, height: qrSize });
  y -= qrSize + 2 * qrPad + 12;

  const idShort =
    input.ticketId.length > 36
      ? `${input.ticketId.slice(0, 8)}…${input.ticketId.slice(-8)}`
      : input.ticketId;
  const idW = font.widthOfTextAtSize(idShort, 6.5);
  page.drawText(idShort, { x: (W - idW) / 2, y: y - 7, size: 6.5, font, color: TEXT_DIM });
  y -= 12;

  const plHintLines = wrapForWidth(TICKET_PDF_QR_HINT_PL, font, 6, contentW, 2);
  y = drawCenteredBlock(page, W, plHintLines, font, 6, TEXT_DIM, y - 2, 7);

  const qrSec = input.ticketQrSecondary.trim();
  if (qrSec) {
    const hintSecLines = wrapForWidth(qrSec, font, 5, contentW, 2);
    y = drawCenteredBlock(page, W, hintSecLines, font, 5, rgb(0.42, 0.42, 0.45), y - 2, 6.5);
  }

  const disc = input.ticketDisclaimer.trim();
  if (disc) {
    const discLines = wrapForWidth(disc, font, 4.5, contentW, 3);
    y = drawCenteredBlock(page, W, discLines, font, 4.5, rgb(0.38, 0.36, 0.34), Math.max(margin + 28, y - 4), 5.5);
  } else {
    y -= 4;
  }

  const footerLines = wrapForWidth(companyFooterShort(), font, 4.2, contentW, 3);
  drawCenteredBlock(page, W, footerLines, font, 4.2, rgb(0.34, 0.32, 0.3), Math.max(margin + 8, y - 6), 5);

  const out = await pdfDoc.save();
  return Buffer.from(out);
}

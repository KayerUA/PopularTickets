import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";
import { COMPANY, companyFooterShort } from "@/lib/company";
import {
  TICKET_PDF_KIND_PL,
  TICKET_PDF_QR_HINT_PL,
  TICKET_PDF_TICKET_NUMBER_HEADING_PL,
} from "@/lib/ticketPdfLegalPl";

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
  /** Мелкая подпись над номером билета на языке интерфейса (пусто = только PL). */
  ticketNumberCaption?: string;
};

const GOLD = rgb(0.91, 0.83, 0.55);
const GOLD_BRIGHT = rgb(0.95, 0.88, 0.62);
const GOLD_MUTED = rgb(0.55, 0.45, 0.28);
const TEXT = rgb(0.82, 0.82, 0.85);
const TEXT_DIM = rgb(0.45, 0.45, 0.48);
const BG = rgb(0.055, 0.048, 0.042);
const BG_HEADER = rgb(0.078, 0.068, 0.058);
const VELVET_DEEP = rgb(0.14, 0.045, 0.065);
const BURGUNDY_PANEL = rgb(0.22, 0.07, 0.1);
const PERF_BAND = rgb(0.38, 0.24, 0.12);

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

/** Вертикальная перфорация «корешок» — полоса с дырками вдоль края билета. */
function drawTicketPerforationV(
  page: PDFPage,
  centerX: number,
  yTop: number,
  yBottom: number,
  holeRadius: number,
  gap: number,
  bg: ReturnType<typeof rgb>
): void {
  const stripHalf = holeRadius + 1.35;
  const h = yTop - yBottom;
  if (h <= gap) return;
  page.drawRectangle({
    x: centerX - stripHalf,
    y: yBottom,
    width: stripHalf * 2,
    height: h,
    color: PERF_BAND,
    opacity: 0.92,
    borderColor: GOLD_BRIGHT,
    borderWidth: 0.5,
    borderOpacity: 0.7,
  });
  for (let cy = yTop - gap * 0.65; cy > yBottom + gap * 0.65; cy -= gap) {
    page.drawCircle({
      x: centerX,
      y: cy,
      size: holeRadius + 0.55,
      borderColor: GOLD_BRIGHT,
      borderWidth: 0.42,
      color: bg,
      opacity: 1,
    });
    page.drawCircle({ x: centerX, y: cy, size: holeRadius * 0.88, color: bg, opacity: 1 });
  }
}

/** Горизонтальная линия отрыва (перфорация) — золотая лента и «дыры». */
function drawTicketPerforationH(
  page: PDFPage,
  centerY: number,
  fromX: number,
  toX: number,
  holeRadius: number,
  gap: number,
  bg: ReturnType<typeof rgb>
): void {
  const bandH = holeRadius * 2 + 2.8;
  const y0 = centerY - bandH / 2;
  const w = toX - fromX;
  page.drawRectangle({
    x: fromX,
    y: y0,
    width: w,
    height: bandH,
    color: PERF_BAND,
    opacity: 0.94,
    borderColor: GOLD_BRIGHT,
    borderWidth: 0.55,
    borderOpacity: 0.75,
  });
  page.drawLine({
    start: { x: fromX + 1.2, y: centerY },
    end: { x: toX - 1.2, y: centerY },
    thickness: 0.55,
    color: GOLD,
    opacity: 0.95,
  });
  for (let cx = fromX + gap * 0.52; cx < toX - holeRadius; cx += gap) {
    page.drawCircle({
      x: cx,
      y: centerY,
      size: holeRadius + 0.55,
      borderColor: GOLD_BRIGHT,
      borderWidth: 0.48,
      color: bg,
      opacity: 1,
    });
    page.drawCircle({ x: cx, y: centerY, size: holeRadius * 0.88, color: bg, opacity: 1 });
  }
}

/** PDF-билет: шапка с логотипом, золотая сетка, футер оператора. */
export async function renderTicketLayoutPdf(input: TicketLayoutDocInput): Promise<Buffer> {
  const regularBytes = fs.readFileSync(dejavuPath("DejaVuSans.ttf"));
  const boldBytes = fs.readFileSync(dejavuPath("DejaVuSans-Bold.ttf"));

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(regularBytes, { subset: true });
  const fontBold = await pdfDoc.embedFont(boldBytes, { subset: true });

  const W = 300;
  const H = 560;
  const margin = 20;
  const contentW = W - 2 * margin;
  const headerH = 52;

  const page = pdfDoc.addPage([W, H]);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG });
  page.drawRectangle({ x: 0, y: 0, width: 6, height: H, color: VELVET_DEEP, opacity: 0.95 });
  page.drawRectangle({ x: W - 6, y: 0, width: 6, height: H, color: VELVET_DEEP, opacity: 0.95 });
  page.drawRectangle({
    x: 0,
    y: H * 0.4,
    width: W,
    height: H * 0.6,
    color: BURGUNDY_PANEL,
    opacity: 0.22,
  });
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
    borderWidth: 1,
  });
  page.drawRectangle({
    x: 15,
    y: 15,
    width: W - 30,
    height: H - 30,
    borderColor: rgb(0.82, 0.68, 0.38),
    borderOpacity: 0.45,
    borderWidth: 0.65,
  });
  drawCornerFrames(page, W, H, 20, 24, GOLD_BRIGHT, 1);

  drawTicketPerforationV(page, 16, H - headerH - 22, margin + 56, 2.05, 6.3, BG);
  drawTicketPerforationV(page, W - 16, H - headerH - 22, margin + 56, 2.05, 6.3, BG);

  page.drawRectangle({ x: 0, y: H - headerH, width: W, height: headerH, color: BG_HEADER });
  page.drawRectangle({
    x: 0,
    y: H - headerH,
    width: W,
    height: headerH * 0.55,
    color: BURGUNDY_PANEL,
    opacity: 0.55,
  });
  page.drawLine({
    start: { x: 0, y: H - headerH },
    end: { x: W, y: H - headerH },
    thickness: 1.35,
    color: rgb(0.82, 0.66, 0.36),
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

  page.drawText(TICKET_PDF_TICKET_NUMBER_HEADING_PL, {
    x: margin,
    y: y - 6,
    size: 5.5,
    font: fontBold,
    color: GOLD_MUTED,
  });
  y -= 8;
  const numCap = (input.ticketNumberCaption ?? "").trim();
  if (numCap) {
    page.drawText(numCap, { x: margin, y: y - 2, size: 4.8, font, color: rgb(0.52, 0.5, 0.46) });
    y -= 7;
  }
  y -= 2;
  page.drawText(input.ticketNumber, { x: margin, y: y - 11, size: 12.5, font: fontBold, color: GOLD_BRIGHT });
  y -= 18;

  const perfCenterY = y - 6;
  drawTicketPerforationH(page, perfCenterY, margin - 6, W - margin + 6, 2.25, 6.35, BG);
  y = perfCenterY - 14;

  const qrBytes = dataUrlPngToBytes(input.qrPngDataUrl);
  const qrImg = await pdfDoc.embedPng(qrBytes);
  const qrSize = 118;
  const qrPad = 9;
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

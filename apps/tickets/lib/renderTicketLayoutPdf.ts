import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";
import sharp from "sharp";
import { COMPANY, companyFooterShort } from "@/lib/company";
import { TICKET_PDF_KIND_PL, TICKET_PDF_QR_HINT_PL } from "@/lib/ticketPdfLegalPl";
import { DEJAVU_SANS_BOLD_TTF, DEJAVU_SANS_TTF } from "@/lib/ticketPdfFontsEmbedded";

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
  /** Как на экране: подпись над номером, лента «один зритель», колонка «Контроль». */
  ticketLabel: string;
  ticketRibbon: string;
  stubControl: string;
};

const GOLD = rgb(0.9, 0.78, 0.48);
const GOLD_BRIGHT = rgb(0.97, 0.9, 0.65);
const GOLD_MUTED = rgb(0.52, 0.42, 0.26);
const TEXT = rgb(0.9, 0.88, 0.92);
const BG = rgb(0.042, 0.034, 0.03);
const BG_HEADER = rgb(0.06, 0.05, 0.045);
const VELVET_DEEP = rgb(0.12, 0.04, 0.055);
const BURGUNDY_PANEL = rgb(0.2, 0.065, 0.09);
const TICKET_RIP_BG = rgb(0.028, 0.018, 0.022);

function drawDashedLine(
  page: PDFPage,
  start: { x: number; y: number },
  end: { x: number; y: number },
  thickness: number,
  color: ReturnType<typeof rgb>,
  dashArray: number[] = [4, 3]
): void {
  page.drawLine({
    start,
    end,
    thickness,
    color,
    dashArray,
    dashPhase: 0,
    opacity: 0.92,
  });
}

/** Вертикальная перфорация + «дырки», в духе веб-компонента TicketRipColumn. */
function drawVerticalRip(
  page: PDFPage,
  centerX: number,
  yTop: number,
  yBottom: number,
  holeFill: ReturnType<typeof rgb>
): void {
  const pad = 11;
  drawDashedLine(
    page,
    { x: centerX, y: yTop - pad },
    { x: centerX, y: yBottom + pad },
    0.85,
    GOLD_BRIGHT,
    [4, 3.2]
  );
  for (const cy of [yTop - 7, yBottom + 7]) {
    page.drawCircle({
      x: centerX,
      y: cy,
      size: 7.2,
      color: holeFill,
      borderColor: GOLD_BRIGHT,
      borderWidth: 1.05,
    });
  }
}

function isJpegBytes(buf: Uint8Array): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/** Логотип может быть JPEG с расширением .png (pdf-lib различает по сигнатуре). */
async function embedLogoImage(pdfDoc: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
  if (isJpegBytes(bytes)) return pdfDoc.embedJpg(bytes);
  return pdfDoc.embedPng(bytes);
}

/** PNG из data URL (допускаем charset и пробелы в base64 — иначе pdf-lib может не встроить QR). */
function dataUrlPngToBytes(dataUrl: string): Uint8Array {
  const raw = dataUrl.trim();
  const head = /^data:image\/png/i;
  if (!head.test(raw)) throw new Error("ticket pdf: ожидается data:image/png…");
  const marker = ";base64,";
  const i = raw.indexOf(marker);
  if (i === -1) throw new Error("ticket pdf: в data URL нет ;base64,");
  const b64 = raw.slice(i + marker.length).replace(/\s+/g, "");
  const buf = Buffer.from(b64, "base64");
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error("ticket pdf: после декодирования base64 это не PNG");
  }
  return new Uint8Array(buf);
}

async function embedQrPng(pdfDoc: PDFDocument, dataUrl: string): Promise<PDFImage> {
  const bytes = dataUrlPngToBytes(dataUrl);
  try {
    return await pdfDoc.embedPng(bytes);
  } catch (e) {
    console.warn("[renderTicketLayoutPdf] embedPng(QR) не удался, повтор через sharp", e);
    const normalized = await sharp(Buffer.from(bytes)).png().toBuffer();
    return await pdfDoc.embedPng(new Uint8Array(normalized));
  }
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

/**
 * Номер билета без обрезки «…»: сначала уменьшаем кегль, затем перенос только по дефису (TKT- / хвост).
 */
function layoutTicketNumberLines(
  ticketNumber: string,
  fontBold: PDFFont,
  maxWidth: number,
  preferredSize: number,
  minSize: number,
  maxLines: number
): { lines: string[]; size: number } {
  const raw = ticketNumber.trim();
  if (!raw) return { lines: [""], size: preferredSize };

  const fits = (text: string, size: number) => fontBold.widthOfTextAtSize(text, size) <= maxWidth;

  let size = preferredSize;
  while (size > minSize && !fits(raw, size)) {
    size -= 0.25;
  }
  if (fits(raw, size)) {
    return { lines: [raw], size };
  }

  const dash = raw.indexOf("-");
  if (dash > 0 && maxLines >= 2) {
    const head = raw.slice(0, dash + 1);
    const tail = raw.slice(dash + 1);
    size = preferredSize;
    while (size > minSize && (!fits(head, size) || !fits(tail, size))) {
      size -= 0.25;
    }
    return { lines: [head, tail], size };
  }

  return { lines: [raw], size: minSize };
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

/** Короткий показ UUID на билете (читаемость + меньше визуального шума). */
function formatTicketIdDisplay(id: string): string {
  const t = id.trim();
  if (t.length <= 16) return t;
  return `${t.slice(0, 8)}…${t.slice(-6)}`;
}

/** Лёгкая «подсветка» в шапке (несколько полос). */
function drawHeaderSheen(page: PDFPage, W: number, H: number, headerH: number) {
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const y0 = H - headerH + (headerH * i) / bands;
    const h = headerH / bands + 0.5;
    page.drawRectangle({
      x: 0,
      y: y0,
      width: W,
      height: h,
      color: GOLD_BRIGHT,
      opacity: 0.02 + i * 0.012,
    });
  }
}

/** Вертикальный градиент панели (наложение полос). */
function drawPanelVerticalWash(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  top: ReturnType<typeof rgb>,
  bottom: ReturnType<typeof rgb>,
  steps: number
) {
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(1, steps - 1);
    const r = top.red * (1 - t) + bottom.red * t;
    const g = top.green * (1 - t) + bottom.green * t;
    const b = top.blue * (1 - t) + bottom.blue * t;
    page.drawRectangle({
      x,
      y: y + i * sh,
      width: w,
      height: sh + 0.4,
      color: rgb(r, g, b),
      opacity: 1,
    });
  }
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
  const regularBytes = new Uint8Array(DEJAVU_SANS_TTF);
  const boldBytes = new Uint8Array(DEJAVU_SANS_BOLD_TTF);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  /* subset:false — надёжнее для кириллицы/смешанных строк в названии события (subset иногда падает в fontkit). */
  const font = await pdfDoc.embedFont(regularBytes, { subset: false });
  const fontBold = await pdfDoc.embedFont(boldBytes, { subset: false });

  const W = 320;
  const H = 582;
  const margin = 22;
  const contentW = W - 2 * margin;
  const headerH = 56;

  const page = pdfDoc.addPage([W, H]);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG });
  page.drawRectangle({ x: 0, y: 0, width: 7, height: H, color: VELVET_DEEP, opacity: 0.92 });
  page.drawRectangle({ x: W - 7, y: 0, width: 7, height: H, color: VELVET_DEEP, opacity: 0.92 });
  page.drawRectangle({
    x: 0,
    y: H * 0.38,
    width: W,
    height: H * 0.62,
    color: BURGUNDY_PANEL,
    opacity: 0.18,
  });
  page.drawRectangle({
    x: 0,
    y: H * 0.4,
    width: W,
    height: H * 0.6,
    color: rgb(0.035, 0.03, 0.026),
    opacity: 0.32,
  });

  page.drawRectangle({
    x: 11,
    y: 11,
    width: W - 22,
    height: H - 22,
    borderColor: GOLD_MUTED,
    borderWidth: 1.05,
  });
  page.drawRectangle({
    x: 17,
    y: 17,
    width: W - 34,
    height: H - 34,
    borderColor: rgb(0.88, 0.72, 0.42),
    borderOpacity: 0.38,
    borderWidth: 0.55,
  });
  drawCornerFrames(page, W, H, 22, 30, GOLD_BRIGHT, 1.05);

  page.drawRectangle({ x: 0, y: H - headerH, width: W, height: headerH, color: BG_HEADER });
  drawHeaderSheen(page, W, H, headerH);
  page.drawRectangle({
    x: 0,
    y: H - headerH,
    width: W,
    height: headerH * 0.52,
    color: BURGUNDY_PANEL,
    opacity: 0.48,
  });
  page.drawLine({
    start: { x: 0, y: H - headerH },
    end: { x: W, y: H - headerH },
    thickness: 1.2,
    color: rgb(0.85, 0.68, 0.38),
  });

  const logoH = 38;
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
  const sub = COMPANY.legalNameShort;
  const brandMaxW = Math.max(80, W - margin - textLeft - 6);
  let brandSize = 11.5;
  while (brandSize > 6.5 && fontBold.widthOfTextAtSize(brand, brandSize) > brandMaxW) {
    brandSize -= 0.35;
  }
  const brandBaseline = H - headerH / 2 + brandSize * 0.35;
  page.drawText(brand, {
    x: textLeft,
    y: brandBaseline,
    size: brandSize,
    font: fontBold,
    color: GOLD_BRIGHT,
  });
  let subSize = 5.8;
  while (subSize > 4.2 && font.widthOfTextAtSize(sub, subSize) > brandMaxW) {
    subSize -= 0.25;
  }
  page.drawText(sub, {
    x: textLeft,
    y: brandBaseline - subSize * 1.35,
    size: subSize,
    font,
    color: rgb(0.62, 0.58, 0.52),
  });

  let y = H - headerH - 16;

  page.drawLine({
    start: { x: margin, y: y + 5 },
    end: { x: W - margin, y: y + 5 },
    thickness: 0.45,
    color: GOLD_MUTED,
    opacity: 0.55,
  });
  y -= 8;

  const kindSec = input.ticketKindSecondary.trim();
  const kindLine = kindSec ? `${TICKET_PDF_KIND_PL} · ${kindSec}` : TICKET_PDF_KIND_PL;
  const kindLines = wrapForWidth(kindLine, fontBold, 6.5, contentW, 3);
  for (const line of kindLines) {
    page.drawText(line, {
      x: margin,
      y: y - 6,
      size: 6.5,
      font: fontBold,
      color: rgb(0.78, 0.66, 0.44),
    });
    y -= 8.5;
  }
  y -= 4;

  const titleSize = 14;
  const titleLines = wrapForWidth(input.eventTitle, fontBold, titleSize, contentW, 4);
  for (const line of titleLines) {
    const shadow = rgb(0.22, 0.16, 0.1);
    page.drawText(line, { x: margin + 0.5, y: y - titleSize * 0.92, size: titleSize, font: fontBold, color: shadow });
    page.drawText(line, { x: margin, y: y - titleSize, size: titleSize, font: fontBold, color: GOLD });
    y -= titleSize + 3;
  }
  y -= 6;

  page.drawLine({
    start: { x: margin, y: y + 2 },
    end: { x: W - margin, y: y + 2 },
    thickness: 0.25,
    color: GOLD_MUTED,
    opacity: 0.45,
  });
  y -= 4;

  const venueLines = wrapForWidth(input.venue, font, 9.2, contentW, 2);
  for (const line of venueLines) {
    page.drawText(line, { x: margin, y: y - 9.2, size: 9.2, font, color: TEXT });
    y -= 11.5;
  }
  y -= 4;

  page.drawText(input.dateTimeLabel, {
    x: margin,
    y: y - 9,
    size: 9,
    font: fontBold,
    color: rgb(0.92, 0.88, 0.82),
  });
  y -= 14;

  page.drawLine({
    start: { x: margin, y: y - 2 },
    end: { x: W - margin, y: y - 2 },
    thickness: 0.45,
    color: GOLD_MUTED,
    opacity: 0.5,
  });
  y -= 8;

  const innerX = 18;
  const leftW = 86;
  const ripW = 11;
  const rightW = 42;
  const innerW = W - 2 * innerX;
  const centerW = innerW - leftW - 2 * ripW - rightW;
  const xLeft = innerX;
  const xRip1 = xLeft + leftW;
  const xCenter = xRip1 + ripW;
  const xRip2 = xCenter + centerW;
  const xRight = xRip2 + ripW;
  const rip1Cx = xRip1 + ripW / 2;
  const rip2Cx = xRip2 + ripW / 2;

  const tripYHi = y;
  const tripYLo = margin + 58;
  let tripH = tripYHi - tripYLo;
  if (tripH < 138) {
    tripH = 138;
  }
  const tripBottom = tripYHi - tripH;

  drawPanelVerticalWash(page, xLeft, tripBottom, leftW, tripH, rgb(0.17, 0.07, 0.095), rgb(0.095, 0.038, 0.055), 10);
  page.drawRectangle({ x: xRip1, y: tripBottom, width: ripW, height: tripH, color: TICKET_RIP_BG });
  drawPanelVerticalWash(
    page,
    xCenter,
    tripBottom,
    centerW,
    tripH,
    rgb(0.052, 0.03, 0.038),
    rgb(0.034, 0.02, 0.028),
    8
  );
  page.drawRectangle({ x: xRip2, y: tripBottom, width: ripW, height: tripH, color: TICKET_RIP_BG });
  drawPanelVerticalWash(
    page,
    xRight,
    tripBottom,
    rightW,
    tripH,
    rgb(0.11, 0.045, 0.065),
    rgb(0.06, 0.028, 0.042),
    6
  );

  drawVerticalRip(page, rip1Cx, tripYHi, tripBottom, TICKET_RIP_BG);
  drawVerticalRip(page, rip2Cx, tripYHi, tripBottom, TICKET_RIP_BG);

  const labelUpper = input.ticketLabel.trim().toUpperCase();
  page.drawText(labelUpper, {
    x: xLeft + 5,
    y: tripYHi - 12,
    size: 5.9,
    font: fontBold,
    color: rgb(0.86, 0.76, 0.52),
  });
  let yLeft = tripYHi - 22;
  const numCap = (input.ticketNumberCaption ?? "").trim();
  if (numCap) {
    page.drawText(numCap, { x: xLeft + 5, y: yLeft, size: 4.6, font, color: rgb(0.52, 0.5, 0.46) });
    yLeft -= 7;
  }
  const numPad = 6;
  const numMaxW = leftW - 2 * numPad;
  const { lines: numLines, size: numSize } = layoutTicketNumberLines(
    input.ticketNumber,
    fontBold,
    numMaxW,
    12.5,
    8,
    3
  );
  const lineStep = numSize * 1.15;
  let numY = yLeft - 2;
  for (const line of numLines) {
    page.drawText(line, { x: xLeft + numPad, y: numY, size: numSize, font: fontBold, color: GOLD_BRIGHT });
    numY -= lineStep;
  }
  const ribbon = input.ticketRibbon.trim().toUpperCase();
  if (ribbon) {
    const rw = font.widthOfTextAtSize(ribbon, 5.2);
    page.drawText(ribbon, {
      x: xLeft + (leftW - rw) / 2,
      y: tripBottom + 10,
      size: 5.2,
      font: fontBold,
      color: rgb(0.55, 0.48, 0.36),
    });
  }

  const qrImg = await embedQrPng(pdfDoc, input.qrPngDataUrl);
  const qrSize = Math.min(114, Math.floor(centerW - 18));
  const qrPad = 7;
  const qrX = xCenter + (centerW - qrSize) / 2;
  const qrTop = tripBottom + tripH / 2 + qrSize / 2 + qrPad;
  const qrBoxY = qrTop - qrSize - 2 * qrPad;
  const glowPad = 3;
  page.drawRectangle({
    x: qrX - qrPad - glowPad,
    y: qrBoxY - glowPad,
    width: qrSize + 2 * (qrPad + glowPad),
    height: qrSize + 2 * (qrPad + glowPad),
    color: GOLD_BRIGHT,
    opacity: 0.08,
  });
  page.drawRectangle({
    x: qrX - qrPad - 1.5,
    y: qrBoxY - 1.5,
    width: qrSize + 2 * qrPad + 3,
    height: qrSize + 2 * qrPad + 3,
    borderColor: GOLD_MUTED,
    borderWidth: 0.55,
  });
  page.drawRectangle({
    x: qrX - qrPad,
    y: qrBoxY,
    width: qrSize + 2 * qrPad,
    height: qrSize + 2 * qrPad,
    color: rgb(0.995, 0.995, 1),
    borderColor: rgb(0.78, 0.62, 0.34),
    borderWidth: 1,
  });
  page.drawImage(qrImg, { x: qrX, y: qrTop - qrPad - qrSize, width: qrSize, height: qrSize });

  const idDisplay = formatTicketIdDisplay(input.ticketId);
  const idSize = 5;
  const idLines = wrapForWidth(idDisplay, font, idSize, centerW - 8, 2);
  let yId = qrBoxY - 8;
  for (const line of idLines) {
    const lw = font.widthOfTextAtSize(line, idSize);
    page.drawText(line, { x: xCenter + (centerW - lw) / 2, y: yId, size: idSize, font, color: rgb(0.4, 0.39, 0.44) });
    yId -= 6;
  }

  const plHintLines = wrapForWidth(TICKET_PDF_QR_HINT_PL, font, 5.1, centerW - 6, 2);
  let yHint = yId - 3;
  for (const line of plHintLines) {
    const lw = font.widthOfTextAtSize(line, 5.1);
    page.drawText(line, { x: xCenter + (centerW - lw) / 2, y: yHint, size: 5.1, font, color: rgb(0.48, 0.46, 0.5) });
    yHint -= 6;
  }

  const qrSec = input.ticketQrSecondary.trim();
  if (qrSec) {
    const hintSecLines = wrapForWidth(qrSec, font, 4.7, centerW - 6, 2);
    for (const line of hintSecLines) {
      const lw = font.widthOfTextAtSize(line, 4.7);
      page.drawText(line, { x: xCenter + (centerW - lw) / 2, y: yHint, size: 4.7, font, color: rgb(0.44, 0.42, 0.46) });
      yHint -= 5.8;
    }
  }

  const stub = input.stubControl.trim().toUpperCase();
  const stubSize = 8.2;
  const stubGap = stubSize * 1.12;
  const stubColCx = xRight + rightW / 2;
  let yStub = tripYHi - 14;
  for (const ch of stub) {
    const cw = fontBold.widthOfTextAtSize(ch, stubSize);
    page.drawText(ch, {
      x: stubColCx - cw / 2,
      y: yStub,
      size: stubSize,
      font: fontBold,
      color: GOLD_BRIGHT,
    });
    yStub -= stubGap;
  }

  y = tripBottom - 8;

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

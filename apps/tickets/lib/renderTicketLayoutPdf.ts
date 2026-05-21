import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import sharp from "sharp";
import { companyFooterShort } from "@/lib/company";
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
const BG = rgb(0.042, 0.034, 0.03);
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

async function embedQrPng(pdfDoc: PDFDocument, dataUrl: string) {
  const bytes = dataUrlPngToBytes(dataUrl);
  try {
    return await pdfDoc.embedPng(bytes);
  } catch (e) {
    console.warn("[renderTicketLayoutPdf] embedPng(QR) не удался, повтор через sharp", e);
    const normalized = await sharp(Buffer.from(bytes)).png().toBuffer();
    return await pdfDoc.embedPng(new Uint8Array(normalized));
  }
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

/** Короткий показ UUID на экране; в PDF — полный id (как на странице return). */
function formatTicketIdDisplay(id: string, full: boolean): string {
  const t = id.trim();
  if (full || t.length <= 16) return t;
  return `${t.slice(0, 8)}…${t.slice(-6)}`;
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

/** PDF-билет: горизонтальный «театральный» макет как на /checkout/return (3 колонки + перфорация). */
export async function renderTicketLayoutPdf(input: TicketLayoutDocInput): Promise<Buffer> {
  const regularBytes = new Uint8Array(DEJAVU_SANS_TTF);
  const boldBytes = new Uint8Array(DEJAVU_SANS_BOLD_TTF);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(regularBytes, { subset: false });
  const fontBold = await pdfDoc.embedFont(boldBytes, { subset: false });

  /** Landscape: полоса билета + блок события снизу. */
  const W = 520;
  const H = 248;
  const margin = 14;
  const ticketH = 152;
  const ticketBottom = H - margin - 62;
  const ticketTop = ticketBottom + ticketH;

  const page = pdfDoc.addPage([W, H]);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG });

  const frameInset = 10;
  page.drawRectangle({
    x: frameInset,
    y: ticketBottom - 6,
    width: W - 2 * frameInset,
    height: ticketH + 12,
    borderColor: rgb(0.78, 0.62, 0.34),
    borderWidth: 1.4,
  });
  page.drawRectangle({
    x: frameInset + 4,
    y: ticketBottom - 2,
    width: W - 2 * frameInset - 8,
    height: ticketH + 4,
    borderColor: GOLD_MUTED,
    borderOpacity: 0.55,
    borderWidth: 0.6,
  });
  page.drawLine({
    start: { x: frameInset + 2, y: ticketTop - 1 },
    end: { x: W - frameInset - 2, y: ticketTop - 1 },
    thickness: 0.8,
    color: GOLD_BRIGHT,
    opacity: 0.35,
  });

  const innerX = frameInset + 6;
  const innerW = W - 2 * innerX;
  const leftW = Math.round(innerW * 0.28);
  const rightW = Math.round(innerW * 0.14);
  const ripW = 11;
  const centerW = innerW - leftW - rightW - 2 * ripW;

  const xLeft = innerX;
  const xRip1 = xLeft + leftW;
  const xCenter = xRip1 + ripW;
  const xRip2 = xCenter + centerW;
  const xRight = xRip2 + ripW;
  const rip1Cx = xRip1 + ripW / 2;
  const rip2Cx = xRip2 + ripW / 2;

  drawPanelVerticalWash(page, xLeft, ticketBottom, leftW, ticketH, rgb(0.17, 0.07, 0.095), rgb(0.04, 0.02, 0.028), 12);
  page.drawRectangle({ x: xRip1, y: ticketBottom, width: ripW, height: ticketH, color: TICKET_RIP_BG });
  drawPanelVerticalWash(
    page,
    xCenter,
    ticketBottom,
    centerW,
    ticketH,
    rgb(0.055, 0.032, 0.04),
    rgb(0.028, 0.016, 0.022),
    8,
  );
  page.drawRectangle({ x: xRip2, y: ticketBottom, width: ripW, height: ticketH, color: TICKET_RIP_BG });
  drawPanelVerticalWash(
    page,
    xRight,
    ticketBottom,
    rightW,
    ticketH,
    rgb(0.11, 0.045, 0.065),
    rgb(0.02, 0.01, 0.015),
    6,
  );

  drawVerticalRip(page, rip1Cx, ticketTop, ticketBottom, TICKET_RIP_BG);
  drawVerticalRip(page, rip2Cx, ticketTop, ticketBottom, TICKET_RIP_BG);

  const labelUpper = input.ticketLabel.trim().toUpperCase();
  page.drawText(labelUpper, {
    x: xLeft + 7,
    y: ticketTop - 14,
    size: 5.4,
    font: fontBold,
    color: rgb(0.86, 0.76, 0.52),
  });

  let yLeft = ticketTop - 24;

  const numPad = 6;
  const numMaxW = leftW - 2 * numPad;
  const { lines: numLines, size: numSize } = layoutTicketNumberLines(
    input.ticketNumber,
    fontBold,
    numMaxW,
    15,
    9,
    3,
  );
  const lineStep = numSize * 1.12;
  let numY = yLeft - 4;
  for (const line of numLines) {
    page.drawText(line, { x: xLeft + numPad, y: numY, size: numSize, font: fontBold, color: GOLD_BRIGHT });
    numY -= lineStep;
  }

  const ribbon = input.ticketRibbon.trim().toUpperCase();
  if (ribbon) {
    const rw = fontBold.widthOfTextAtSize(ribbon, 5);
    page.drawText(ribbon, {
      x: xLeft + (leftW - rw) / 2,
      y: ticketBottom + 11,
      size: 5,
      font: fontBold,
      color: rgb(0.55, 0.48, 0.36),
    });
  }

  const qrImg = await embedQrPng(pdfDoc, input.qrPngDataUrl);
  const qrSize = Math.min(88, Math.floor(centerW - 24));
  const qrPad = 6;
  const qrX = xCenter + (centerW - qrSize) / 2;
  const qrY = ticketBottom + ticketH - qrSize - 28;

  page.drawRectangle({
    x: qrX - qrPad - 2,
    y: qrY - qrPad - 2,
    width: qrSize + 2 * qrPad + 4,
    height: qrSize + 2 * qrPad + 4,
    color: GOLD_BRIGHT,
    opacity: 0.1,
  });
  page.drawRectangle({
    x: qrX - qrPad,
    y: qrY - qrPad,
    width: qrSize + 2 * qrPad,
    height: qrSize + 2 * qrPad,
    color: rgb(0.995, 0.995, 1),
    borderColor: rgb(0.78, 0.62, 0.34),
    borderWidth: 1.05,
  });
  page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  const idDisplay = formatTicketIdDisplay(input.ticketId, true);
  const idSize = 4.5;
  const idLines = wrapForWidth(idDisplay, font, idSize, centerW - 10, 2);
  let yId = ticketBottom + 10;
  for (const line of idLines) {
    const lw = font.widthOfTextAtSize(line, idSize);
    page.drawText(line, { x: xCenter + (centerW - lw) / 2, y: yId, size: idSize, font, color: rgb(0.42, 0.4, 0.45) });
    yId -= 5.4;
  }

  const stub = input.stubControl.trim().toUpperCase();
  const stubSize = 9;
  const stubGap = stubSize * 1.08;
  const stubColCx = xRight + rightW / 2;
  let yStub = ticketTop - 16;
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

  const metaW = W - 2 * margin;
  let metaY = ticketBottom - 16;

  const kindSec = input.ticketKindSecondary.trim();
  const kindLine = kindSec ? `${TICKET_PDF_KIND_PL} · ${kindSec}` : TICKET_PDF_KIND_PL;
  const kindW = fontBold.widthOfTextAtSize(kindLine, 5.2);
  page.drawText(kindLine, {
    x: (W - kindW) / 2,
    y: metaY,
    size: 5.2,
    font: fontBold,
    color: rgb(0.62, 0.54, 0.38),
  });
  metaY -= 9;

  const titleLines = wrapForWidth(input.eventTitle, fontBold, 9.5, metaW, 2);
  for (const line of titleLines) {
    const tw = fontBold.widthOfTextAtSize(line, 9.5);
    page.drawText(line, { x: (W - tw) / 2, y: metaY, size: 9.5, font: fontBold, color: GOLD });
    metaY -= 11;
  }

  const whenVenue = `${input.dateTimeLabel} · ${input.venue}`;
  const subLines = wrapForWidth(whenVenue, font, 6.8, metaW, 2);
  for (const line of subLines) {
    const sw = font.widthOfTextAtSize(line, 6.8);
    page.drawText(line, { x: (W - sw) / 2, y: metaY, size: 6.8, font, color: rgb(0.58, 0.56, 0.54) });
    metaY -= 8;
  }

  const qrSec = input.ticketQrSecondary.trim();
  if (qrSec) {
    const hintSecLines = wrapForWidth(qrSec, font, 4.5, metaW, 2);
    for (const line of hintSecLines) {
      const sw = font.widthOfTextAtSize(line, 4.5);
      page.drawText(line, { x: (W - sw) / 2, y: metaY, size: 4.5, font, color: rgb(0.44, 0.42, 0.46) });
      metaY -= 5.2;
    }
  }

  const plHintLines = wrapForWidth(TICKET_PDF_QR_HINT_PL, font, 4.6, metaW, 2);
  for (const line of plHintLines) {
    const sw = font.widthOfTextAtSize(line, 4.6);
    page.drawText(line, { x: (W - sw) / 2, y: metaY, size: 4.6, font, color: rgb(0.46, 0.44, 0.48) });
    metaY -= 5.4;
  }

  const disc = input.ticketDisclaimer.trim();
  if (disc) {
    const discLines = wrapForWidth(disc, font, 4.4, metaW, 2);
    metaY = drawCenteredBlock(page, W, discLines, font, 4.4, rgb(0.38, 0.36, 0.34), metaY - 2, 5.2);
  }

  const footerLines = wrapForWidth(companyFooterShort(), font, 4, metaW, 2);
  drawCenteredBlock(page, W, footerLines, font, 4, rgb(0.34, 0.32, 0.3), Math.max(margin, metaY - 4), 4.8);

  const out = await pdfDoc.save();
  return Buffer.from(out);
}

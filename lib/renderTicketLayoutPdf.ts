import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, rgb } from "pdf-lib";
import { COMPANY } from "@/lib/company";

export type TicketLayoutDocInput = {
  /** `data:image/png;base64,...` — QR как на странице */
  qrPngDataUrl: string;
  eventTitle: string;
  venue: string;
  dateTimeLabel: string;
  ticketNumber: string;
  ticketId: string;
  kindLabel: string;
  qrHint: string;
};

const GOLD = rgb(0.91, 0.83, 0.55);
const GOLD_MUTED = rgb(0.55, 0.45, 0.28);
const TEXT = rgb(0.82, 0.82, 0.85);
const TEXT_DIM = rgb(0.45, 0.45, 0.48);
const BG = rgb(0.06, 0.055, 0.048);

function dataUrlPngToBytes(dataUrl: string): Uint8Array {
  const m = /^data:image\/png;base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) throw new Error("ticket pdf: ожидается data:image/png;base64,…");
  return Uint8Array.from(Buffer.from(m[1], "base64"));
}

function dejavuPath(file: "DejaVuSans.ttf" | "DejaVuSans-Bold.ttf"): string {
  return path.join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf", file);
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

/** PDF с встроенным DejaVu Sans (TTF) — корректная PL/UK/RU, без librsvg/PNG-шрифтов. */
export async function renderTicketLayoutPdf(input: TicketLayoutDocInput): Promise<Buffer> {
  const regularBytes = fs.readFileSync(dejavuPath("DejaVuSans.ttf"));
  const boldBytes = fs.readFileSync(dejavuPath("DejaVuSans-Bold.ttf"));

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(regularBytes, { subset: true });
  const fontBold = await pdfDoc.embedFont(boldBytes, { subset: true });

  const W = 220;
  const H = 400;
  const margin = 14;
  const contentW = W - 2 * margin;

  const page = pdfDoc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG });
  page.drawRectangle({
    x: 9,
    y: 9,
    width: W - 18,
    height: H - 18,
    borderColor: GOLD_MUTED,
    borderWidth: 1,
    color: BG,
  });
  page.drawRectangle({
    x: 12,
    y: 12,
    width: W - 24,
    height: H - 24,
    borderColor: rgb(0.78, 0.63, 0.35),
    borderOpacity: 0.28,
    borderWidth: 0.6,
    color: BG,
  });

  let y = H - margin;
  const brand = COMPANY.productName.toUpperCase();

  page.drawText(brand, {
    x: margin,
    y: y - 8,
    size: 7.5,
    font: fontBold,
    color: GOLD_MUTED,
  });
  y -= 12;

  page.drawText(input.kindLabel.toUpperCase(), {
    x: margin,
    y: y - 7,
    size: 6.5,
    font: fontBold,
    color: rgb(0.66, 0.6, 0.43),
  });
  y -= 14;

  const titleLines = wrapForWidth(input.eventTitle, fontBold, 12, contentW, 4);
  for (const line of titleLines) {
    page.drawText(line, { x: margin, y: y - 12, size: 12, font: fontBold, color: GOLD });
    y -= 14;
  }
  y -= 4;

  const venueLines = wrapForWidth(input.venue, font, 8.5, contentW, 2);
  for (const line of venueLines) {
    page.drawText(line, { x: margin, y: y - 9, size: 8.5, font, color: TEXT });
    y -= 11;
  }
  y -= 4;

  page.drawText(input.dateTimeLabel, { x: margin, y: y - 9, size: 8.5, font, color: TEXT });
  y -= 14;

  page.drawText(input.ticketNumber, { x: margin, y: y - 11, size: 11, font: fontBold, color: GOLD });
  y -= 18;

  const qrBytes = dataUrlPngToBytes(input.qrPngDataUrl);
  const qrImg = await pdfDoc.embedPng(qrBytes);
  const qrSize = 108;
  const qrPad = 5;
  const qrX = (W - qrSize) / 2;
  const qrBoxY = y - qrSize - qrPad;
  page.drawRectangle({
    x: qrX - qrPad,
    y: qrBoxY,
    width: qrSize + 2 * qrPad,
    height: qrSize + 2 * qrPad,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: GOLD_MUTED,
    borderWidth: 0.5,
  });
  page.drawImage(qrImg, { x: qrX, y: y - qrSize, width: qrSize, height: qrSize });
  y -= qrSize + 2 * qrPad + 12;

  const idShort =
    input.ticketId.length > 36
      ? `${input.ticketId.slice(0, 8)}…${input.ticketId.slice(-8)}`
      : input.ticketId;
  const idW = font.widthOfTextAtSize(idShort, 6.5);
  page.drawText(idShort, { x: (W - idW) / 2, y: y - 7, size: 6.5, font, color: TEXT_DIM });
  y -= 10;

  const hintW = font.widthOfTextAtSize(input.qrHint, 6);
  page.drawText(input.qrHint, { x: Math.max(margin, (W - hintW) / 2), y: y - 6, size: 6, font, color: TEXT_DIM });

  const out = await pdfDoc.save();
  return Buffer.from(out);
}

import QRCode from "qrcode";

const primaryOpts: QRCode.QRCodeToDataURLOptions = {
  type: "image/png",
  width: 280,
  margin: 1,
  errorCorrectionLevel: "M",
  color: { dark: "#0a0608", light: "#fafafa" },
};

function toDataUrlFromBuffer(buf: Buffer): string {
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** PNG-буфер QR (payload = UUID билета). */
export async function ticketQrPngBuffer(ticketId: string): Promise<Buffer> {
  const payload = String(ticketId ?? "").trim();
  if (!payload) throw new Error("ticketQrPngBuffer: пустой id билета");

  try {
    return await QRCode.toBuffer(payload, {
      type: "png",
      width: 280,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0a0608", light: "#fafafa" },
    });
  } catch (e1) {
    console.warn("[ticketQrPngBuffer] primary не удался, минимальные опции", e1);
    return QRCode.toBuffer(payload, {
      type: "png",
      width: 256,
      margin: 1,
      errorCorrectionLevel: "L",
    });
  }
}

/** PNG data URL для показа и скачивания QR билета (тот же payload, что в письме). */
export async function ticketQrDataUrl(ticketId: string): Promise<string> {
  try {
    return await QRCode.toDataURL(String(ticketId ?? "").trim(), primaryOpts);
  } catch (e1) {
    console.warn("[ticketQrDataUrl] toDataURL(primary) не удался, пробуем buffer", e1);
    const buf = await ticketQrPngBuffer(ticketId);
    return toDataUrlFromBuffer(buf);
  }
}

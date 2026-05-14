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

/** PNG data URL для показа и скачивания QR билета (тот же payload, что в письме). */
export async function ticketQrDataUrl(ticketId: string): Promise<string> {
  const payload = String(ticketId ?? "").trim();
  if (!payload) throw new Error("ticketQrDataUrl: пустой id билета");

  try {
    return await QRCode.toDataURL(payload, primaryOpts);
  } catch (e1) {
    console.warn("[ticketQrDataUrl] toDataURL(primary) не удался, пробуем toBuffer", e1);
    try {
      const buf = await QRCode.toBuffer(payload, {
        type: "png",
        width: 280,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#0a0608", light: "#fafafa" },
      });
      return toDataUrlFromBuffer(buf);
    } catch (e2) {
      console.warn("[ticketQrDataUrl] toBuffer не удался, минимальные опции", e2);
      return QRCode.toDataURL(payload, {
        type: "image/png",
        width: 256,
        margin: 1,
        errorCorrectionLevel: "L",
      });
    }
  }
}

import QRCode from "qrcode";

/** PNG data URL для показа и скачивания QR билета (тот же payload, что в письме). */
export async function ticketQrDataUrl(ticketId: string): Promise<string> {
  return QRCode.toDataURL(ticketId, {
    type: "image/png",
    width: 280,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0a0608", light: "#fafafa" },
  });
}

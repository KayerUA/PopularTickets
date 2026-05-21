import QRCode from "qrcode";
import { Resend } from "resend";
import { ticketEmailHtml } from "@/lib/email/templates";
import type { EmailTicketCardInput } from "@/lib/email/ticketCardHtml";
import { emailTicketPdfLayoutStrings, ticketEmailStrings } from "@/lib/email/ticketEmailI18n";
import { ticketQrDataUrl } from "@/lib/qrDataUrl";
import { renderTicketLayoutPdf } from "@/lib/renderTicketLayoutPdf";
import type { AppLocale } from "@/i18n/routing";

const fromDefault = "PopularTickets <onboarding@resend.dev>";

function safeFileBase(ticketNumber: string): string {
  return ticketNumber.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 48) || "bilet";
}

export async function sendTicketsEmail(params: {
  to: string;
  eventTitle: string;
  venue: string;
  startsAt: string;
  tickets: { id: string; ticketNumber: string }[];
  locale: AppLocale;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY не задан — письмо не отправлено");
    return;
  }
  const resend = new Resend(key);
  const from = process.env.RESEND_FROM_EMAIL || fromDefault;

  const pdfLabels = emailTicketPdfLayoutStrings(params.locale);
  const str = ticketEmailStrings(params.locale);
  const attachments: { filename: string; content: Buffer }[] = [];
  const emailTickets: EmailTicketCardInput[] = [];

  for (const t of params.tickets) {
    const base = safeFileBase(t.ticketNumber);
    let qrImageSrc = "";
    try {
      qrImageSrc = await ticketQrDataUrl(t.id);
    } catch (err) {
      console.error("[sendTicketsEmail] QR data URL failed", { ticketId: t.id }, err);
    }

    try {
      if (qrImageSrc) {
        const pdfBuf = await renderTicketLayoutPdf({
          qrPngDataUrl: qrImageSrc,
          eventTitle: params.eventTitle,
          venue: params.venue,
          dateTimeLabel: params.startsAt,
          ticketNumber: t.ticketNumber,
          ticketId: t.id,
          ...pdfLabels,
        });
        attachments.push({ filename: `bilet-${base}.pdf`, content: pdfBuf });
        emailTickets.push({
          ticketNumber: t.ticketNumber,
          ticketId: t.id,
          qrImageSrc,
          attachmentLabel: str.colAttachment,
        });
      } else {
        throw new Error("no qr");
      }
    } catch (err) {
      console.error("[sendTicketsEmail] PDF failed, fallback PNG", { ticketId: t.id }, err);
      const png =
        qrImageSrc.length > 0
          ? Buffer.from(qrImageSrc.replace(/^data:image\/png;base64,/, ""), "base64")
          : await QRCode.toBuffer(t.id, {
              type: "png",
              width: 320,
              margin: 1,
              errorCorrectionLevel: "M",
            });
      if (!qrImageSrc) {
        qrImageSrc = `data:image/png;base64,${png.toString("base64")}`;
      }
      attachments.push({ filename: `qr-${base}.png`, content: png });
      emailTickets.push({
        ticketNumber: t.ticketNumber,
        ticketId: t.id,
        qrImageSrc,
        attachmentLabel: str.colAttachmentPng,
      });
    }
  }

  const html = ticketEmailHtml({
    eventTitle: params.eventTitle,
    venue: params.venue,
    startsAt: params.startsAt,
    tickets: emailTickets,
    cardLabels: {
      ticketLabel: pdfLabels.ticketLabel,
      ticketRibbon: pdfLabels.ticketRibbon,
      stubControl: pdfLabels.stubControl,
    },
    locale: params.locale,
  });

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `${str.subjectPrefix} ${params.eventTitle}`,
    html,
    attachments,
  });

  if (error) {
    console.error("Resend error", error);
    throw new Error("Не удалось отправить email");
  }
}

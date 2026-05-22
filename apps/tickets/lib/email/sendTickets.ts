import { Resend } from "resend";
import { ticketEmailHtml } from "@/lib/email/templates";
import type { EmailTicketCardInput } from "@/lib/email/ticketCardHtml";
import { emailTicketPdfLayoutStrings, ticketEmailStrings } from "@/lib/email/ticketEmailI18n";
import { ticketQrPngBuffer } from "@/lib/qrDataUrl";
import { renderTicketLayoutPdf } from "@/lib/renderTicketLayoutPdf";
import type { AppLocale } from "@/i18n/routing";

const fromDefault = "PopularTickets <onboarding@resend.dev>";

type ResendAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
  inlineContentId?: string;
};

function safeFileBase(ticketNumber: string): string {
  return ticketNumber.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 48) || "bilet";
}

/** Content-ID для inline QR в HTML письма (Gmail блокирует data: URL). */
function qrInlineContentId(ticketId: string): string {
  return `qr-${ticketId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48)}`;
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
  const attachments: ResendAttachment[] = [];
  const emailTickets: EmailTicketCardInput[] = [];

  for (const t of params.tickets) {
    const base = safeFileBase(t.ticketNumber);
    const inlineId = qrInlineContentId(t.id);

    let qrPng: Buffer;
    let qrDataUrl = "";
    try {
      qrPng = await ticketQrPngBuffer(t.id);
      qrDataUrl = `data:image/png;base64,${qrPng.toString("base64")}`;
    } catch (err) {
      console.error("[sendTicketsEmail] QR generation failed", { ticketId: t.id }, err);
      continue;
    }

    attachments.push({
      filename: `qr-${base}.png`,
      content: qrPng,
      contentType: "image/png",
      inlineContentId: inlineId,
    });

    try {
      const pdfBuf = await renderTicketLayoutPdf({
        qrPngDataUrl: qrDataUrl,
        eventTitle: params.eventTitle,
        venue: params.venue,
        dateTimeLabel: params.startsAt,
        ticketNumber: t.ticketNumber,
        ticketId: t.id,
        ...pdfLabels,
      });
      attachments.push({
        filename: `bilet-${base}.pdf`,
        content: pdfBuf,
        contentType: "application/pdf",
      });
      emailTickets.push({
        ticketNumber: t.ticketNumber,
        ticketId: t.id,
        qrImageSrc: `cid:${inlineId}`,
        attachmentLabel: str.colAttachment,
      });
    } catch (err) {
      console.error("[sendTicketsEmail] PDF failed, inline QR + PNG attachment", { ticketId: t.id }, err);
      emailTickets.push({
        ticketNumber: t.ticketNumber,
        ticketId: t.id,
        qrImageSrc: `cid:${inlineId}`,
        attachmentLabel: str.colAttachmentPng,
      });
    }
  }

  if (!emailTickets.length) {
    throw new Error("Не удалось сформировать билеты для письма");
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

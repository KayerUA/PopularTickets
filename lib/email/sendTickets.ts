import QRCode from "qrcode";
import { Resend } from "resend";
import { ticketEmailHtml } from "@/lib/email/templates";
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
  const attachments: { filename: string; content: Buffer }[] = [];

  for (const t of params.tickets) {
    const base = safeFileBase(t.ticketNumber);
    try {
      const dataUrl = await ticketQrDataUrl(t.id);
      const pdfBuf = await renderTicketLayoutPdf({
        qrPngDataUrl: dataUrl,
        eventTitle: params.eventTitle,
        venue: params.venue,
        dateTimeLabel: params.startsAt,
        ticketNumber: t.ticketNumber,
        ticketId: t.id,
        ...pdfLabels,
      });
      attachments.push({ filename: `bilet-${base}.pdf`, content: pdfBuf });
    } catch (err) {
      console.error("[sendTicketsEmail] PDF failed, fallback PNG", { ticketId: t.id }, err);
      const png = await QRCode.toBuffer(t.id, {
        type: "png",
        width: 320,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      attachments.push({ filename: `qr-${base}.png`, content: png });
    }
  }

  const html = ticketEmailHtml({
    eventTitle: params.eventTitle,
    venue: params.venue,
    startsAt: params.startsAt,
    tickets: params.tickets,
    locale: params.locale,
  });

  const sub = ticketEmailStrings(params.locale);
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `${sub.subjectPrefix} ${params.eventTitle}`,
    html,
    attachments,
  });

  if (error) {
    console.error("Resend error", error);
    throw new Error("Не удалось отправить email");
  }
}

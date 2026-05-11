import QRCode from "qrcode";
import { Resend } from "resend";
import { ticketEmailHtml } from "@/lib/email/templates";

const fromDefault = "PopularTickets <onboarding@resend.dev>";

export async function sendTicketsEmail(params: {
  to: string;
  eventTitle: string;
  venue: string;
  startsAt: string;
  tickets: { id: string; ticketNumber: string }[];
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY не задан — письмо не отправлено");
    return;
  }
  const resend = new Resend(key);
  const from = process.env.RESEND_FROM_EMAIL || fromDefault;

  const attachments: { filename: string; content: Buffer }[] = [];
  for (let i = 0; i < params.tickets.length; i++) {
    const t = params.tickets[i];
    const png = await QRCode.toBuffer(t.id, {
      type: "png",
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
    });
    attachments.push({ filename: `qr-${t.ticketNumber}.png`, content: png });
  }

  const html = ticketEmailHtml({
    eventTitle: params.eventTitle,
    venue: params.venue,
    startsAt: params.startsAt,
    tickets: params.tickets,
  });

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Билеты: ${params.eventTitle}`,
    html,
    attachments,
  });

  if (error) {
    console.error("Resend error", error);
    throw new Error("Не удалось отправить email");
  }
}

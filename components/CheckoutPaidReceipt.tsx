import type { PaidOrderReceipt } from "@/lib/checkoutReceipt";
import { ticketQrDataUrl } from "@/lib/qrDataUrl";
import { renderTicketLayoutPdf } from "@/lib/renderTicketLayoutPdf";
import { CopyTextButton } from "@/components/CopyTextButton";
import { formatEventDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";

export type CheckoutReceiptLabels = {
  ticketsHeading: string;
  downloadTicket: string;
  ticketPngKind: string;
  ticketPngQrHint: string;
  copyId: string;
  copiedId: string;
  emailAlso: string;
  shareWarning: string;
  checkInHint: string;
  ticketLabel: string;
};

export async function CheckoutPaidReceipt({
  receipt,
  locale,
  labels,
}: {
  receipt: PaidOrderReceipt;
  locale: AppLocale;
  labels: CheckoutReceiptLabels;
}) {
  const when = formatEventDateTime(receipt.startsAt, locale);

  const ticketRows = await Promise.all(
    receipt.tickets.map(async (t) => {
      const dataUrl = await ticketQrDataUrl(t.id);
      const pdfBuf = await renderTicketLayoutPdf({
        qrPngDataUrl: dataUrl,
        eventTitle: receipt.eventTitle,
        venue: receipt.venue,
        dateTimeLabel: when,
        ticketNumber: t.ticket_number,
        ticketId: t.id,
        kindLabel: labels.ticketPngKind,
        qrHint: labels.ticketPngQrHint,
      });
      const ticketPdfDataUrl = `data:application/pdf;base64,${pdfBuf.toString("base64")}`;
      return { ...t, dataUrl, ticketPdfDataUrl };
    })
  );

  return (
    <div className="mt-8 space-y-6 border-t border-poet-gold/20 pt-8 text-left">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-poet-gold/80">{labels.ticketsHeading}</p>
        <p className="mt-1 text-sm text-zinc-400">
          {receipt.eventTitle} · {when}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{receipt.venue}</p>
      </div>
      <p className="text-sm leading-relaxed text-zinc-400">
        {labels.emailAlso}{" "}
        <span className="break-all text-zinc-300">{receipt.email}</span>
      </p>
      <p className="text-xs text-amber-200/90">{labels.shareWarning}</p>
      <ul className="space-y-6">
        {ticketRows.map((t) => (
          <li key={t.id} className="rounded-2xl border border-poet-gold/20 bg-zinc-950/50 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-zinc-500">{labels.ticketLabel}</p>
            <p className="font-mono text-sm text-poet-gold-bright">{t.ticket_number}</p>
            <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL из QR */}
              <img
                src={t.dataUrl}
                alt=""
                width={200}
                height={200}
                className="rounded-lg bg-white"
              />
              <div className="flex w-full max-w-xs flex-col gap-2 sm:w-auto">
                <a
                  href={t.ticketPdfDataUrl}
                  download={`bilet-${t.ticket_number}.pdf`}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-poet-gold/40 bg-poet-gold/15 px-4 py-2 text-center text-sm font-medium text-poet-gold-bright transition hover:bg-poet-gold/25"
                >
                  {labels.downloadTicket}
                </a>
                <CopyTextButton text={t.id} label={labels.copyId} copiedLabel={labels.copiedId} />
                <p className="break-all font-mono text-[11px] leading-relaxed text-zinc-500">{t.id}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">{labels.checkInHint}</p>
    </div>
  );
}

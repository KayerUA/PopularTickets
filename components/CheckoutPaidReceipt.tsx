import type { PaidOrderReceipt } from "@/lib/checkoutReceipt";
import { ticketQrDataUrl } from "@/lib/qrDataUrl";
import { renderTicketLayoutPdf } from "@/lib/renderTicketLayoutPdf";
import { CopyTextButton } from "@/components/CopyTextButton";
import { formatEventDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";

export type CheckoutReceiptLabels = {
  ticketsHeading: string;
  downloadTicket: string;
  copyId: string;
  copiedId: string;
  emailAlso: string;
  shareWarning: string;
  checkInHint: string;
  ticketLabel: string;
  /** Krótki napis „teatralny” na bilecie (np. jeden widz). */
  ticketRibbon: string;
  ticketPdfKindSecondary: string;
  ticketPdfQrSecondary: string;
  ticketPdfDisclaimer: string;
  ticketPdfNumberCaption: string;
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
        ticketKindSecondary: labels.ticketPdfKindSecondary,
        ticketQrSecondary: labels.ticketPdfQrSecondary,
        ticketDisclaimer: labels.ticketPdfDisclaimer,
        ticketNumberCaption: labels.ticketPdfNumberCaption,
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
      <ul className="space-y-8">
        {ticketRows.map((t) => (
          <li
            key={t.id}
            className="group relative overflow-hidden rounded-sm border-0 bg-gradient-to-br from-[#1f0a10] via-[#120709] to-zinc-950 shadow-[0_0_0_1px_rgba(197,160,89,0.35),0_24px_48px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,248,220,0.08)] ring-1 ring-poet-gold/25"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-poet-gold/60 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-6 left-0 w-2 border-r border-dashed border-poet-gold/25 opacity-80 sm:left-1"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-6 right-0 w-2 border-l border-dashed border-poet-gold/25 opacity-80 sm:right-1"
              aria-hidden
            />
            <div className="relative px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-poet-gold/15 pb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-poet-gold/70">{labels.ticketLabel}</p>
                  <p className="font-display mt-1 text-lg tracking-wide text-poet-gold-bright sm:text-xl">{t.ticket_number}</p>
                </div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">{labels.ticketRibbon}</p>
              </div>
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL из QR */}
                <img
                  src={t.dataUrl}
                  alt=""
                  width={200}
                  height={200}
                  className="rounded-md border border-poet-gold/20 bg-white p-1 shadow-inner"
                />
                <div className="flex w-full max-w-xs flex-col gap-2 sm:w-auto">
                  <a
                    href={t.ticketPdfDataUrl}
                    download={`bilet-${t.ticket_number}.pdf`}
                    className="btn-poet btn-poet-theatre inline-flex min-h-11 w-full items-center justify-center px-4 py-2.5 text-center text-sm"
                  >
                    {labels.downloadTicket}
                  </a>
                  <CopyTextButton text={t.id} label={labels.copyId} copiedLabel={labels.copiedId} />
                  <p className="break-all font-mono text-[11px] leading-relaxed text-zinc-500">{t.id}</p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">{labels.checkInHint}</p>
    </div>
  );
}

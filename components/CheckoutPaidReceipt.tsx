import type { PaidOrderReceipt } from "@/lib/checkoutReceipt";
import { ticketQrDataUrl } from "@/lib/qrDataUrl";
import { renderTicketLayoutPdf } from "@/lib/renderTicketLayoutPdf";
import { CopyTextButton } from "@/components/CopyTextButton";
import { TicketRipColumn } from "@/components/TicketRipColumn";
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
  /** Prawa kolumna — napis jak na fizycznym bilecie (np. KONTROLA). */
  stubControl: string;
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
        ticketLabel: labels.ticketLabel,
        ticketRibbon: labels.ticketRibbon,
        stubControl: labels.stubControl,
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
            className="group relative flex min-h-0 flex-col overflow-hidden rounded-lg border-2 border-poet-gold/55 bg-[#0c0709] shadow-[0_0_0_1px_rgba(0,0,0,0.65),0_20px_44px_-18px_rgba(0,0,0,0.88)] sm:min-h-[12.5rem] sm:flex-row sm:items-stretch"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-poet-gold/60 to-transparent"
              aria-hidden
            />

            {/* Левый корешок / талон (как на советском билете — узкая колонка) */}
            <aside className="relative z-0 flex flex-col justify-between border-b-2 border-dashed border-poet-gold/80 bg-gradient-to-b from-[#2a1218] via-[#180a0e] to-[#0a0507] px-3.5 py-4 sm:w-[min(30%,7.75rem)] sm:min-w-[6.25rem] sm:max-w-[8.5rem] sm:border-b-0 sm:border-r-0 sm:px-2.5 sm:py-5">
              <p className="text-[8px] font-bold uppercase leading-tight tracking-[0.32em] text-poet-gold/90">{labels.ticketLabel}</p>
              <p className="font-display my-2 text-lg font-semibold leading-snug tracking-wide text-poet-gold-bright [overflow-wrap:anywhere] sm:my-3 sm:text-xl">
                {t.ticket_number}
              </p>
              <p className="text-[9px] uppercase tracking-[0.22em] text-poet-gold/55">{labels.ticketRibbon}</p>
            </aside>

            <TicketRipColumn className="hidden sm:flex" />

            {/* Основная часть: QR и действия */}
            <div className="relative z-0 flex min-h-0 flex-1 flex-col items-center gap-4 border-b-2 border-dashed border-poet-gold/70 px-4 py-5 sm:border-b-0 sm:px-5 sm:py-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL из QR */}
              <img
                src={t.dataUrl}
                alt=""
                width={200}
                height={200}
                className="shrink-0 rounded-md border-2 border-poet-gold/40 bg-white p-1.5 shadow-[0_0_22px_-4px_rgba(197,160,89,0.38)]"
              />
              <div className="flex w-full max-w-xs flex-col gap-2 sm:max-w-[16rem]">
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

            <TicketRipColumn className="hidden sm:flex" />

            {/* Правая колонка «КОНТРОЛЬ» */}
            <aside className="relative z-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1c0c10] via-[#120709] to-black px-1 py-4 sm:w-[min(22%,4.75rem)] sm:min-w-[3.75rem] sm:max-w-[5.25rem] sm:py-6">
              <p
                className="font-display text-center text-sm font-bold uppercase leading-none tracking-[0.22em] text-poet-gold-bright [writing-mode:vertical-rl] sm:text-base"
                style={{ textOrientation: "mixed" }}
              >
                {labels.stubControl}
              </p>
            </aside>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">{labels.checkInHint}</p>
    </div>
  );
}

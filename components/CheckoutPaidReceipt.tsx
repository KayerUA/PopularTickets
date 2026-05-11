import type { PaidOrderReceipt } from "@/lib/checkoutReceipt";
import { ticketQrDataUrl } from "@/lib/qrDataUrl";
import { renderTicketLayoutPdf } from "@/lib/renderTicketLayoutPdf";
import { CopyTextButton } from "@/components/CopyTextButton";
import { TicketScallopedDivider } from "@/components/TicketScallopedDivider";
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
  /** Nagłówek wąskiej części jak na fizycznym bilecie (korżok / kontrola). */
  stubTitle: string;
  /** Krótki opis linii perforacji. */
  stubHint: string;
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
            className="group relative overflow-hidden rounded-xl border-2 border-poet-gold/45 bg-gradient-to-br from-[#2a1018] via-[#14060c] to-[#050304] shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_24px_48px_-16px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,248,220,0.08)]"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-poet-gold/70 to-transparent"
              aria-hidden
            />
            {/* Mobile: корешок сверху, волна отрыва, основная часть с QR */}
            <div className="flex flex-col lg:hidden">
              <aside className="relative border-b border-poet-gold/35 bg-[#1a080e] px-4 py-3.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.38em] text-poet-gold/90">{labels.stubTitle}</p>
                <p className="font-display mt-1.5 break-all text-xl font-semibold tracking-wide text-poet-gold-bright">{t.ticket_number}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-poet-gold/55">{labels.ticketRibbon}</p>
                <p className="mt-2 text-[10px] leading-snug text-zinc-500">{labels.stubHint}</p>
              </aside>
              <div className="relative bg-[#0b0609]/80 px-1">
                <TicketScallopedDivider />
              </div>
              <div className="flex flex-col items-center gap-4 px-4 pb-6 pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL из QR */}
                <img
                  src={t.dataUrl}
                  alt=""
                  width={200}
                  height={200}
                  className="rounded-md border-2 border-poet-gold/35 bg-white p-1.5 shadow-[0_0_24px_-4px_rgba(197,160,89,0.35)]"
                />
                <div className="flex w-full max-w-xs flex-col gap-2">
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

            {/* Desktop: основная часть | перфорация | корешок справа */}
            <div className="hidden min-h-[14rem] flex-row lg:flex">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-5 px-6 py-6 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL из QR */}
                <img
                  src={t.dataUrl}
                  alt=""
                  width={200}
                  height={200}
                  className="shrink-0 rounded-md border-2 border-poet-gold/35 bg-white p-1.5 shadow-[0_0_24px_-4px_rgba(197,160,89,0.35)]"
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

              <div
                className="flex w-10 shrink-0 flex-col items-center justify-evenly border-l border-r border-poet-gold/50 bg-gradient-to-b from-black/60 via-[#1a0a0f] to-black/60 py-4"
                aria-hidden
              >
                {Array.from({ length: 13 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 shrink-0 rounded-full border-[2px] border-poet-gold-bright bg-[#0b0609] shadow-[inset_0_0_5px_rgba(0,0,0,0.95),0_0_0_1px_rgba(232,212,139,0.25)]"
                  />
                ))}
              </div>

              <aside className="flex w-[6.75rem] shrink-0 flex-col justify-between border-l border-dashed border-poet-gold/50 bg-gradient-to-b from-[#240c12] via-[#140609] to-black px-2.5 py-5 text-center sm:w-[7.5rem]">
                <div>
                  <p className="text-[8px] font-bold uppercase leading-tight tracking-[0.2em] text-poet-gold/90">{labels.stubTitle}</p>
                </div>
                <p
                  className="font-display mx-auto max-h-[11rem] break-all text-center text-lg font-semibold leading-snug tracking-wide text-poet-gold-bright [overflow-wrap:anywhere] [writing-mode:vertical-rl] sm:text-xl"
                  style={{ textOrientation: "mixed" }}
                >
                  {t.ticket_number}
                </p>
                <p className="text-[9px] uppercase tracking-[0.2em] text-poet-gold/45">{labels.ticketRibbon}</p>
              </aside>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">{labels.checkInHint}</p>
    </div>
  );
}

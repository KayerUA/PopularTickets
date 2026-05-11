/**
 * Вертикальная линия перфорации (пунктир) + «вырезы» сверху и снизу, как на бумажном билете.
 */
export function TicketRipColumn({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex w-4 shrink-0 flex-col items-center justify-center bg-[#080506] sm:w-5 ${className}`}
      aria-hidden
    >
      <span className="absolute left-1/2 top-2 z-[1] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[2.5px] border-poet-gold-bright bg-[#0b0609] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_0_0_1px_rgba(197,160,89,0.35)]" />
      <span className="absolute bottom-2 left-1/2 z-[1] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[2.5px] border-poet-gold-bright bg-[#0b0609] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_0_0_1px_rgba(197,160,89,0.35)]" />
      <span className="absolute bottom-5 left-1/2 top-5 w-0 -translate-x-1/2 border-l-2 border-dashed border-poet-gold/95" />
    </div>
  );
}

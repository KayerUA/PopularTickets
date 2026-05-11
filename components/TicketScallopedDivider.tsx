/**
 * Горизонтальная «ломаная» линия отрыва (волна / зубцы), как на бумажном билете.
 */
export function TicketScallopedDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`block w-full text-poet-gold-bright ${className}`}
      viewBox="0 0 320 14"
      preserveAspectRatio="none"
      aria-hidden
      height={14}
    >
      <path
        d="M0,7 Q8,0 16,7 T32,7 T48,7 T64,7 T80,7 T96,7 T112,7 T128,7 T144,7 T160,7 T176,7 T192,7 T208,7 T224,7 T240,7 T256,7 T272,7 T288,7 T304,7 T320,7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.95}
      />
      <path
        d="M0,7 Q8,14 16,7 T32,7 T48,7 T64,7 T80,7 T96,7 T112,7 T128,7 T144,7 T160,7 T176,7 T192,7 T208,7 T224,7 T240,7 T256,7 T272,7 T288,7 T304,7 T320,7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeOpacity={0.45}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { clampEventImageFocal } from "@/lib/eventCoverFocal";

export type EventCoverFocalValue = { x: number; y: number };

type Props = {
  previewUrl: string | null;
  value: EventCoverFocalValue;
  onChange: (next: EventCoverFocalValue) => void;
  className?: string;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Кликабельное превью 16:9 для выбора object-position (без формы). */
export function EventCoverFocalPicker({ previewUrl, value, onChange, className }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(() => clampEventImageFocal(value.x));
  const [y, setY] = useState(() => clampEventImageFocal(value.y));

  useEffect(() => {
    setX(clampEventImageFocal(value.x));
    setY(clampEventImageFocal(value.y));
  }, [value.x, value.y]);

  const apply = (nx: number, ny: number) => {
    const next = { x: round1(clampEventImageFocal(nx)), y: round1(clampEventImageFocal(ny)) };
    setX(next.x);
    setY(next.y);
    onChange(next);
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    apply(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  };

  const resetCenter = () => apply(50, 50);

  if (!previewUrl) {
    return (
      <p className="rounded-xl border border-dashed border-poet-gold/20 bg-zinc-950/40 px-3 py-6 text-center text-sm text-zinc-500">
        Нет изображения для превью
      </p>
    );
  }

  return (
    <div className={className}>
      <div
        ref={boxRef}
        role="presentation"
        onClick={onClick}
        className="relative aspect-video w-full cursor-crosshair overflow-hidden rounded-xl border border-poet-gold/25 bg-zinc-950"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover select-none"
          style={{ objectPosition: `${x}% ${y}%` }}
          draggable={false}
        />
        <span
          className="pointer-events-none absolute z-[1] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-poet-gold/90 shadow-[0_0_0_2px_rgba(0,0,0,0.5)]"
          style={{ left: `${x}%`, top: `${y}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <span>
          <span className="font-mono text-zinc-200">{x}%</span> × <span className="font-mono text-zinc-200">{y}%</span>
        </span>
        <button
          type="button"
          onClick={resetCenter}
          className="rounded-lg border border-poet-gold/30 px-3 py-1.5 text-zinc-200 transition hover:bg-poet-gold/10"
        >
          В центр
        </button>
      </div>
    </div>
  );
}

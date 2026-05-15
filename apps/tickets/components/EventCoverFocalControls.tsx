"use client";

import { useEffect, useRef, useState } from "react";
import { clampEventImageFocal } from "@/lib/eventCoverFocal";

type Props = {
  previewUrl: string | null;
  initialX: number;
  initialY: number;
};

/**
 * Превью 16:9 как на витрине. Клик задаёт точку для object-position при object-cover.
 * Здесь нативный img — blob: и произвольные URL не ломают Next/Image в проде.
 */
export function EventCoverFocalControls({ previewUrl, initialX, initialY }: Props) {
  const [x, setX] = useState(() => clampEventImageFocal(initialX));
  const [y, setY] = useState(() => clampEventImageFocal(initialY));
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setX(clampEventImageFocal(initialX));
    setY(clampEventImageFocal(initialY));
  }, [initialX, initialY]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 100;
    const ny = ((e.clientY - r.top) / r.height) * 100;
    setX(round1(clampEventImageFocal(nx)));
    setY(round1(clampEventImageFocal(ny)));
  };

  const resetCenter = () => {
    setX(50);
    setY(50);
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <input type="hidden" name="imageFocalX" value={String(x)} />
      <input type="hidden" name="imageFocalY" value={String(y)} />
      <p className="text-sm text-zinc-300">Точка фокуса обложки</p>
      <p className="text-xs text-zinc-500">
        Кликните по превью — эта область останется в кадре при обрезке под карточки и страницу события (кадр 16:9). «В центр» — сброс 50×50 %.
      </p>
      {previewUrl ? (
        <div
          ref={boxRef}
          role="presentation"
          onClick={onClick}
          className="relative aspect-video w-full max-w-xl cursor-crosshair overflow-hidden rounded-xl border border-poet-gold/25 bg-zinc-950"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- blob:/внешние URL превью в админке; Next/Image падает в проде */}
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
      ) : (
        <p className="rounded-lg border border-dashed border-poet-gold/20 bg-zinc-950/40 px-3 py-4 text-sm text-zinc-500">
          Загрузите файл обложки или вставьте ссылку выше — появится превью для выбора фокуса.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
        <span>
          Сейчас: <span className="font-mono text-zinc-200">{x}%</span> × <span className="font-mono text-zinc-200">{y}%</span>
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

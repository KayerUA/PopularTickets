"use client";

import { useState } from "react";
import { EventCoverFocalPicker, type EventCoverFocalValue } from "@/components/EventCoverFocalPicker";
import { clampEventImageFocal } from "@/lib/eventCoverFocal";

type Props = {
  previewUrl: string | null;
  initialX: number;
  initialY: number;
  /** Файл выбран, но превью отключено (слишком тяжёлый для браузера). */
  pendingLabel?: string | null;
};

/**
 * Превью 16:9 как на витрине. Клик задаёт точку для object-position при object-cover.
 */
export function EventCoverFocalControls({ previewUrl, initialX, initialY, pendingLabel }: Props) {
  const [focal, setFocal] = useState<EventCoverFocalValue>(() => ({
    x: clampEventImageFocal(initialX),
    y: clampEventImageFocal(initialY),
  }));

  return (
    <div className="space-y-2 sm:col-span-2">
      <input type="hidden" name="imageFocalX" value={String(focal.x)} />
      <input type="hidden" name="imageFocalY" value={String(focal.y)} />
      <p className="text-sm text-zinc-300">Точка фокуса обложки</p>
      <p className="text-xs text-zinc-500">
        Кликните по превью — эта область останется в кадре при обрезке под карточки и страницу события (кадр 16:9). «В центр» — сброс 50×50 %.
      </p>
      {previewUrl ? (
        <EventCoverFocalPicker previewUrl={previewUrl} value={focal} onChange={setFocal} />
      ) : pendingLabel ? (
        <p className="rounded-lg border border-poet-gold/25 bg-zinc-950/50 px-3 py-4 text-sm text-zinc-400">
          {pendingLabel}. Точка фокуса — по центру (50×50 %), её можно сдвинуть после сохранения при редактировании.
        </p>
      ) : (
        <p className="rounded-lg border border-dashed border-poet-gold/20 bg-zinc-950/40 px-3 py-4 text-sm text-zinc-500">
          Загрузите файл обложки или вставьте ссылку выше — появится превью для выбора фокуса.
        </p>
      )}
    </div>
  );
}

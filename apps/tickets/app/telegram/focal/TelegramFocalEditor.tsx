"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EventCoverFocalPicker, type EventCoverFocalValue } from "@/components/EventCoverFocalPicker";

type LoadState = {
  mode: "draft" | "event";
  draftId?: string;
  eventId?: string;
  eventIndex: number;
  eventCount: number;
  title: string;
  focalX: number;
  focalY: number;
  hasImage: boolean;
};

type TgWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  showAlert: (message: string, cb?: () => void) => void;
};

function getWebApp(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { Telegram?: { WebApp: TgWebApp } }).Telegram?.WebApp ?? null;
}

export function TelegramFocalEditor({
  draftId,
  eventId,
  initialIndex,
}: {
  draftId?: string;
  eventId?: string;
  initialIndex: number;
}) {
  const [eventIndex, setEventIndex] = useState(initialIndex);
  const [loadState, setLoadState] = useState<LoadState | null>(null);
  const [focal, setFocal] = useState<EventCoverFocalValue>({ x: 50, y: 50 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const imageQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (draftId) q.set("draftId", draftId);
    if (eventId) q.set("eventId", eventId);
    q.set("eventIndex", String(eventIndex));
    return q.toString();
  }, [draftId, eventId, eventIndex]);

  const load = useCallback(async () => {
    const tg = getWebApp();
    if (!tg?.initData) {
      setError("Откройте редактор из Telegram-бота.");
      setLoading(false);
      return;
    }
    if (!draftId && !eventId) {
      setError("Не указан черновик или событие.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/telegram/focal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Init-Data": tg.initData,
        },
        body: JSON.stringify({
          action: "load",
          initData: tg.initData,
          draftId,
          eventId,
          eventIndex,
        }),
      });
      const json = (await res.json()) as LoadState & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Не удалось загрузить");

      setLoadState(json);
      setFocal({ x: json.focalX, y: json.focalY });

      if (json.hasImage) {
        const imgRes = await fetch(`/api/telegram/focal/image?${imageQuery}`, {
          headers: { "X-Telegram-Init-Data": tg.initData },
        });
        if (!imgRes.ok) throw new Error("Не удалось загрузить изображение");
        const blob = await imgRes.blob();
        setPreviewUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      } else {
        setPreviewUrl(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [draftId, eventId, eventIndex, imageQuery]);

  const save = useCallback(async () => {
    const tg = getWebApp();
    if (!tg?.initData || !loadState) return;

    setSaving(true);
    tg.MainButton.showProgress();
    try {
      const res = await fetch("/api/telegram/focal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Init-Data": tg.initData,
        },
        body: JSON.stringify({
          action: "save",
          initData: tg.initData,
          draftId: loadState.draftId,
          eventId: loadState.eventId,
          eventIndex: loadState.eventIndex,
          focalX: focal.x,
          focalY: focal.y,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Не удалось сохранить");
      tg.showAlert("Точка фокуса сохранена", () => tg.close());
    } catch (e) {
      tg.showAlert(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
      tg.MainButton.hideProgress();
    }
  }, [focal.x, focal.y, loadState]);

  useEffect(() => {
    const tg = getWebApp();
    tg?.ready();
    tg?.expand();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tg = getWebApp();
    if (!tg || !loadState?.hasImage) return;
    tg.MainButton.setText("Сохранить");
    tg.MainButton.onClick(save);
    tg.MainButton.show();
    return () => {
      tg.MainButton.offClick(save);
      tg.MainButton.hide();
    };
  }, [loadState?.hasImage, save]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (loading) {
    return <p className="p-4 text-sm text-zinc-400">Загрузка…</p>;
  }

  if (error) {
    return <p className="p-4 text-sm text-red-300">{error}</p>;
  }

  if (!loadState) return null;

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <div>
        <h1 className="text-lg font-semibold text-poet-gold">Точка фокуса обложки</h1>
        <p className="mt-1 text-sm text-zinc-400">{loadState.title}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Кликните по превью — эта область останется в кадре на сайте (формат 16:9).
        </p>
      </div>

      {loadState.eventCount > 1 && loadState.mode === "draft" ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: loadState.eventCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setEventIndex(i)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                i === eventIndex
                  ? "border-poet-gold/60 bg-poet-gold/15 text-poet-gold"
                  : "border-poet-gold/20 text-zinc-300"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}

      <EventCoverFocalPicker previewUrl={previewUrl} value={focal} onChange={setFocal} />

      {!loadState.hasImage ? (
        <p className="text-sm text-amber-200/90">У этого события нет обложки — фокус сохранится на будущее.</p>
      ) : null}
    </div>
  );
}

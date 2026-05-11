"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { extractTicketUuid } from "@/lib/extractTicketUuid";

type Props = {
  onUuid: (uuid: string) => void;
};

export function CheckInQrScanner({ onUuid }: Props) {
  const reactId = useId().replace(/:/g, "");
  const readerId = `checkin-h5qr-${reactId}`;
  const onUuidRef = useRef(onUuid);
  onUuidRef.current = onUuid;

  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const instanceRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;
    const handledRef = { done: false };

    const stopInstance = async (h: Html5Qrcode | null) => {
      if (!h) return;
      try {
        await h.stop();
      } catch {
        /* уже остановлен */
      }
      try {
        await h.clear();
      } catch {
        /* */
      }
    };

    (async () => {
      setErr(null);
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      const html5 = new Html5Qrcode(readerId, false);
      instanceRef.current = html5;

      const cfg = {
        fps: 8,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1,
      } as const;

      const onOk = (decoded: string) => {
        if (handledRef.done || cancelled) return;
        const uuid = extractTicketUuid(decoded);
        if (uuid) {
          handledRef.done = true;
          onUuidRef.current(uuid);
          setScanning(false);
          return;
        }
        setErr("В коде нет UUID билета (ожидается формат как в письме / QR).");
      };

      const tryStart = async (constraints: MediaTrackConstraints) => {
        await html5.start(constraints, cfg, onOk, () => {});
      };

      try {
        await tryStart({ facingMode: "environment" });
      } catch {
        if (cancelled) return;
        try {
          await tryStart({ facingMode: "user" });
        } catch {
          if (!cancelled) {
            setErr("Не удалось открыть камеру. Разрешите доступ в браузере или введите UUID вручную.");
            setScanning(false);
          }
          await stopInstance(html5);
          instanceRef.current = null;
          return;
        }
      }

      if (cancelled) {
        await stopInstance(html5);
        instanceRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      const h = instanceRef.current;
      instanceRef.current = null;
      void stopInstance(h);
    };
  }, [scanning, readerId]);

  return (
    <div className="space-y-2">
      {!scanning ? (
        <button
          type="button"
          onClick={() => {
            setErr(null);
            setScanning(true);
          }}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-poet-gold/35 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-poet-gold-bright transition hover:border-poet-gold/50 hover:bg-poet-gold/10 sm:w-auto"
        >
          <CameraGlyph className="h-4 w-4 shrink-0 opacity-90" />
          Сканировать QR камерой
        </button>
      ) : (
        <div className="space-y-3">
          <div
            id={readerId}
            className="min-h-[220px] overflow-hidden rounded-xl border border-poet-gold/25 bg-black/80 sm:min-h-[260px]"
          />
          <button
            type="button"
            onClick={() => setScanning(false)}
            className="w-full rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white sm:w-auto"
          >
            Остановить камеру
          </button>
        </div>
      )}
      {err ? <p className="text-sm text-amber-200/95">{err}</p> : null}
      <p className="text-[11px] leading-relaxed text-zinc-600">
        Нужен HTTPS и разрешение на камеру. На телефоне обычно удобнее задняя камера.
      </p>
    </div>
  );
}

function CameraGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h4l2-2h4l2 2h4v12H4V7zm8 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
    </svg>
  );
}

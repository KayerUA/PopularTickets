"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { AppLocale } from "@/i18n/routing";
import type { SeatMapState } from "@/lib/seating/types";
import { seatLabel, seatingText } from "@/lib/seating/i18n";

const SEAT = 36;
const STEP = 44;
const PAD = 24;
const LABEL = 34;
const STAGE = 88;
const MAX_SCALE = 1.6;
type View = { x: number; y: number; scale: number };
type Point = { x: number; y: number };
const copy = {
  ru: { hint: "Разведите пальцы для приближения · двигайте схему", tap: "Коснитесь места, чтобы приблизить", plus: "Приблизить", minus: "Отдалить", fit: "Весь зал", remove: "Убрать место", empty: "Выбранные места появятся здесь", limit: "Все места выбраны. Уберите одно, чтобы выбрать другое." },
  pl: { hint: "Rozsuń palce, aby przybliżyć · przeciągnij plan", tap: "Dotknij miejsca, aby przybliżyć", plus: "Przybliż", minus: "Oddal", fit: "Cała sala", remove: "Usuń miejsce", empty: "Tutaj pojawią się wybrane miejsca", limit: "Wybrano wszystkie miejsca. Usuń jedno, aby wybrać inne." },
  uk: { hint: "Розведіть пальці для наближення · рухайте схему", tap: "Торкніться місця, щоб наблизити", plus: "Наблизити", minus: "Віддалити", fit: "Уся зала", remove: "Прибрати місце", empty: "Обрані місця з’являться тут", limit: "Усі місця обрані. Приберіть одне, щоб вибрати інше." },
};

export function SeatMap({ map, selected, onChange, limit, locale, disabled = false, exactCount = false }: {
  map: SeatMapState; selected: string[]; onChange: (ids: string[]) => void;
  limit: number; locale: AppLocale; disabled?: boolean; exactCount?: boolean;
}) {
  const t = seatingText[locale];
  const ui = copy[locale];
  const rows = [...new Set(map.seats.map((seat) => seat.row))];
  const minCol = Math.min(0, ...map.seats.map((seat) => seat.column));
  const maxCol = Math.max(0, ...map.seats.map((seat) => seat.column));
  const width = PAD * 2 + LABEL + (maxCol - minCol) * STEP + SEAT;
  const height = PAD * 2 + STAGE + Math.max(0, rows.length - 1) * STEP + SEAT;
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const viewRef = useRef(view);
  const wheelHandler = useRef<(event: WheelEvent) => void>(() => {});
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef({ moved: false, start: { x: 0, y: 0 }, seat: "" });
  const fitScale = Math.min((size.width - 24) / width, (size.height - 24) / height, 1);
  const ready = size.width > 0;
  const overview = view.scale * SEAT < 24;

  function apply(next: View) {
    const scale = Math.max(Math.max(0.1, fitScale), Math.min(MAX_SCALE, next.scale));
    const bound = (offset: number, world: number, frame: number) => world <= frame
      ? (frame - world) / 2
      : Math.min(16, Math.max(frame - world - 16, offset));
    const bounded = { scale, x: bound(next.x, width * scale, size.width), y: bound(next.y, height * scale, size.height) };
    viewRef.current = bounded;
    setView(bounded);
  }

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => {
      const w = frame.clientWidth;
      const h = frame.clientHeight;
      const scale = Math.min((w - 24) / width, (h - 24) / height, 1);
      const fitted = { scale, x: (w - width * scale) / 2, y: (h - height * scale) / 2 };
      setSize({ width: w, height: h });
      viewRef.current = fitted;
      setView(fitted);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [width, height]);

  function zoom(scale: number, anchor = { x: size.width / 2, y: size.height / 2 }) {
    const old = viewRef.current;
    const next = Math.max(fitScale, Math.min(MAX_SCALE, scale));
    const ratio = next / old.scale;
    apply({ scale: next, x: anchor.x - (anchor.x - old.x) * ratio, y: anchor.y - (anchor.y - old.y) * ratio });
  }

  wheelHandler.current = (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const rect = frameRef.current!.getBoundingClientRect();
    zoom(viewRef.current.scale * Math.exp(-event.deltaY * 0.01), { x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const handle = (event: WheelEvent) => wheelHandler.current(event);
    frame.addEventListener("wheel", handle, { passive: false });
    return () => frame.removeEventListener("wheel", handle);
  }, []);

  function focusSeat(id: string) {
    const seat = map.seats.find((item) => item.id === id);
    if (!seat) return;
    const scale = Math.max(1.15, viewRef.current.scale);
    const x = PAD + LABEL + (seat.column - minCol) * STEP + SEAT / 2;
    const y = PAD + STAGE + rows.indexOf(seat.row) * STEP + SEAT / 2;
    apply({ scale, x: size.width / 2 - x * scale, y: size.height / 2 - y * scale });
  }

  function choose(id: string) {
    const seat = map.seats.find((item) => item.id === id);
    if (!seat || disabled || seat.status !== "free") return;
    if (selected.includes(id)) onChange(selected.filter((value) => value !== id));
    else if (selected.length < limit) onChange([...selected, id]);
  }

  function point(event: ReactPointerEvent): Point {
    const rect = frameRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const p = point(event);
    if (!pointers.current.size) gesture.current = { moved: false, start: p, seat: (event.target as HTMLElement).closest<HTMLElement>("[data-seat-id]")?.dataset.seatId ?? "" };
    else gesture.current.moved = true;
    pointers.current.set(event.pointerId, p);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const oldPoint = pointers.current.get(event.pointerId);
    if (!oldPoint) return;
    const before = [...pointers.current.values()];
    const p = point(event);
    pointers.current.set(event.pointerId, p);
    const after = [...pointers.current.values()];
    const oldView = viewRef.current;
    if (after.length >= 2) {
      gesture.current.moved = true;
      const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
      const from = mid(before[0], before[1]);
      const to = mid(after[0], after[1]);
      const scale = Math.max(fitScale, Math.min(MAX_SCALE, oldView.scale * distance(after[0], after[1]) / Math.max(1, distance(before[0], before[1]))));
      apply({ scale, x: to.x - (from.x - oldView.x) * scale / oldView.scale, y: to.y - (from.y - oldView.y) * scale / oldView.scale });
    } else {
      if (Math.hypot(p.x - gesture.current.start.x, p.y - gesture.current.start.y) > 6) gesture.current.moved = true;
      if (gesture.current.moved) apply({ ...oldView, x: oldView.x + p.x - oldPoint.x, y: oldView.y + p.y - oldPoint.y });
    }
  }

  function up(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    if (cancelled) gesture.current.moved = true;
    if (!pointers.current.size && !gesture.current.moved && gesture.current.seat) {
      if (viewRef.current.scale * SEAT < 24) focusSeat(gesture.current.seat);
      else choose(gesture.current.seat);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section className="-mx-2 space-y-3 sm:mx-0" aria-label={t.title} data-seat-picker>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-poet-gold-bright">{t.title}</h2>
        <span className="rounded-full border border-poet-gold/25 bg-poet-gold/10 px-3 py-1 text-sm tabular-nums text-poet-gold-bright" aria-live="polite">
          {t.selected}: {selected.length}{exactCount ? ` / ${limit}` : ""}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-poet-gold/20 bg-[#100d10]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#100d10] to-transparent px-3 py-3 text-center text-[11px] text-zinc-400" aria-live="polite">
          {overview ? ui.tap : ui.hint}
        </div>
        <div
          ref={frameRef}
          data-seat-viewport
          className="relative h-[360px] w-full cursor-grab overflow-hidden select-none active:cursor-grabbing sm:h-[460px]"
          style={{ touchAction: "none" }}
          onPointerDown={down} onPointerMove={move}
          onPointerUp={(event) => up(event)} onPointerCancel={(event) => up(event, true)}
          onLostPointerCapture={(event) => { pointers.current.delete(event.pointerId); }}
        >
          <div data-seat-world className="absolute left-0 top-0 origin-top-left" style={{ width, height, visibility: ready ? "visible" : "hidden", transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, willChange: "transform" }}>
            <div className="absolute flex items-start justify-center rounded-t-[50%] border-t-2 border-poet-gold/60 bg-gradient-to-b from-poet-gold/10 to-transparent pt-4 text-[18px] uppercase tracking-[0.45em] text-poet-gold-bright" style={{ left: width * 0.22, width: width * 0.56, top: PAD, height: 58 }}>{t.stage}</div>
            {rows.map((row, index) => <span key={row} className="absolute flex items-center justify-center text-sm font-medium text-zinc-500" style={{ left: PAD, top: PAD + STAGE + index * STEP, width: LABEL - 8, height: SEAT }}>{row}</span>)}
            {map.seats.map((seat) => {
              const chosen = selected.includes(seat.id);
              const unavailable = seat.status !== "free";
              return <button
                key={seat.id} type="button" data-seat-id={seat.id}
                style={{ left: PAD + LABEL + (seat.column - minCol) * STEP, top: PAD + STAGE + rows.indexOf(seat.row) * STEP, width: SEAT, height: SEAT }}
                disabled={disabled || unavailable || (!chosen && selected.length >= limit)}
                aria-pressed={chosen}
                aria-label={`${seatLabel(seat.id, locale)}, ${chosen ? t.selected : seat.status === "free" ? t.free : seat.status === "blocked" ? t.blocked : t.occupied}`}
                onClick={(event) => { if (event.detail === 0) choose(seat.id); }}
                onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) focusSeat(seat.id); }}
                className={`absolute flex items-center justify-center rounded-t-xl rounded-b-md border-b-[3px] text-sm font-semibold outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${chosen ? "border-[#bc9445] bg-[#edca80] text-[#211709] shadow-[0_0_18px_#d4ab5540]" : unavailable ? "border-[#25232b] bg-[#29262e] text-[#686470]" : "border-[#246353] bg-[#3f957f] text-white hover:bg-[#58b49b]"}`}
              >{chosen ? "✓" : seat.number}</button>;
            })}
          </div>
          {!overview && rows.map((row, index) => {
            const top = view.y + (PAD + STAGE + index * STEP + SEAT / 2) * view.scale - 12;
            return top > 42 && top < size.height - 28 ? <span key={row} className="pointer-events-none absolute left-1 flex h-6 min-w-7 items-center justify-center rounded-md bg-[#100d10]/90 px-1 text-[11px] font-semibold text-zinc-300" style={{ top }}>{row}</span> : null;
          })}
        </div>
        <div className="absolute bottom-3 right-3 flex gap-1 rounded-xl border border-white/10 bg-[#211a20]/95 p-1 shadow-lg">
          <button type="button" aria-label={ui.minus} title={ui.minus} disabled={!ready || view.scale <= fitScale + 0.001} onClick={() => zoom(viewRef.current.scale / 1.45)} className="h-11 w-11 rounded-lg text-2xl text-white hover:bg-white/10 disabled:opacity-30">−</button>
          <button type="button" aria-label={ui.fit} title={ui.fit} onClick={() => apply({ scale: fitScale, x: 0, y: 0 })} className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-200 hover:bg-white/10"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg></button>
          <button type="button" aria-label={ui.plus} title={ui.plus} disabled={!ready || view.scale >= MAX_SCALE} onClick={() => zoom(viewRef.current.scale * 1.45)} className="h-11 w-11 rounded-lg text-2xl text-white hover:bg-white/10 disabled:opacity-30">+</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-400">
        {[[t.free, "bg-[#3f957f]"], [t.selected, "bg-[#edca80]"], [t.occupied, "bg-[#55515d]"]].map(([label, color]) => <span key={label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} />{label}</span>)}
      </div>
      <div className="flex min-h-11 flex-wrap items-center gap-2" aria-live="polite">
        {selected.length ? selected.map((id) => <button key={id} type="button" disabled={disabled} onClick={() => choose(id)} aria-label={`${ui.remove}: ${seatLabel(id, locale)}`} className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-poet-gold/25 bg-poet-gold/10 px-3 text-sm text-poet-gold-bright disabled:opacity-50">{seatLabel(id, locale)}<span aria-hidden className="text-lg text-poet-gold/70">×</span></button>) : <p className="text-xs text-zinc-500">{ui.empty}</p>}
      </div>
      {selected.length >= limit && <p className="text-xs text-zinc-400">{ui.limit}</p>}
    </section>
  );
}

"use client";

import type { AppLocale } from "@/i18n/routing";
import type { SeatMapState } from "@/lib/seating/types";
import { seatLabel, seatingText } from "@/lib/seating/i18n";

export function SeatMap({ map, selected, onChange, limit, locale, disabled = false }: {
  map: SeatMapState; selected: string[]; onChange: (ids: string[]) => void;
  limit: number; locale: AppLocale; disabled?: boolean;
}) {
  const t = seatingText[locale];
  const rows = [...new Set(map.seats.map(s => s.row))];
  return <section className="space-y-3" aria-label={t.title}>
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-poet-gold-bright">{t.title}</h2><span className="text-sm text-zinc-300" aria-live="polite">{selected.length} / {limit}</span></div>
    <p className="text-xs text-zinc-400">{t.scroll}</p>
    <div className="overflow-x-auto rounded-xl border border-poet-gold/20 bg-black/30 p-3" tabIndex={0} role="region" aria-label={t.title}>
      <div className="min-w-[970px] pb-2">
        <div className="mx-auto mb-8 w-72 border-t-4 border-poet-gold/50 pt-2 text-center text-xs uppercase tracking-[0.3em] text-zinc-400">{t.stage}</div>
        {rows.map(row => <div key={row} className="mb-1.5 grid items-center gap-1" style={{ gridTemplateColumns: "36px repeat(26, 32px)" }}>
          <span className="sticky left-0 z-10 rounded bg-[#0b0709] py-2 text-xs text-zinc-300">{row}</span>
          {map.seats.filter(s => s.row === row).map(s => {
            const chosen = selected.includes(s.id);
            return <button key={s.id} type="button" style={{ gridColumn: s.column + 2 }}
              disabled={disabled || s.status !== "free" || (!chosen && selected.length >= limit)}
              aria-pressed={chosen} aria-label={`${seatLabel(s.id, locale)}, ${chosen ? t.selected : s.status === "free" ? t.free : s.status === "blocked" ? t.blocked : t.occupied}`}
              onClick={() => onChange(chosen ? selected.filter(id => id !== s.id) : [...selected, s.id])}
              className={`h-8 rounded-md border text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${chosen ? "border-poet-gold bg-poet-gold text-black" : s.status === "blocked" ? "border-zinc-800 bg-zinc-900 text-zinc-600" : s.status === "occupied" ? "border-zinc-700 bg-zinc-700 text-zinc-400" : "border-emerald-500/50 bg-emerald-950 text-emerald-200 hover:bg-emerald-800"}`}>
              {s.number}
            </button>;
          })}
        </div>)}
      </div>
    </div>
    <div className="flex flex-wrap gap-4 text-xs text-zinc-400">{[[t.free,"bg-emerald-800"],[t.selected,"bg-poet-gold"],[t.occupied,"bg-zinc-600"],[t.blocked,"bg-zinc-900 border border-zinc-700"]].map(([label,color]) => <span key={label} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${color}`} />{label}</span>)}</div>
    {selected.length > 0 && <p className="text-sm text-poet-gold-bright">{selected.map(id => seatLabel(id, locale)).join("; ")}</p>}
  </section>;
}

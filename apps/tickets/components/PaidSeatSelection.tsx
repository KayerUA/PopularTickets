"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SeatMap } from "@/components/SeatMap";
import { assignSeats } from "@/app/actions/seating";
import type { SeatMapState } from "@/lib/seating/types";
import type { AppLocale } from "@/i18n/routing";
import { seatingText } from "@/lib/seating/i18n";
export function PaidSeatSelection({ map, quantity, locale, token, orderId }: {
  map: SeatMapState; quantity: number; locale: AppLocale; token?: string; orderId?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const t = seatingText[locale];
  return <div className="space-y-4">
    <SeatMap map={map} selected={selected} onChange={setSelected} limit={quantity} locale={locale} disabled={pending || saved} exactCount />
    <p className="text-sm text-zinc-400">{t.choose}</p>
    {message && <p role="status" className="text-amber-200">{message}</p>}
    <div className="flex flex-wrap gap-4">
      <button type="button" disabled={pending || saved || selected.length !== quantity} className="btn-poet px-5 py-3 disabled:opacity-40" onClick={async () => {
        setPending(true); setMessage("");
        try {
          const result = await assignSeats({ token, orderId, seats: selected, locale });
          if ("error" in result) { setMessage(result.error ?? t.conflict); router.refresh(); }
          else { setSaved(true); setMessage(result.emailFailed ? t.emailFailed : t.saved); router.refresh(); }
        } catch { setMessage(t.unavailable); }
        finally { setPending(false); }
      }}>{pending ? t.saving : t.save}</button>
      <button type="button" disabled={pending} className="text-sm text-poet-gold underline" onClick={() => { setSelected([]); router.refresh(); }}>{t.refresh}</button>
    </div>
  </div>;
}

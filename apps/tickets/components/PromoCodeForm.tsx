"use client";

import { useActionState, useState } from "react";
import { createPromoCode, type CreatePromoCodeState } from "@/app/actions/promo-codes";

type EventOption = { id: string; title: string; slug: string; listingKind: string };

const initialState: CreatePromoCodeState = null;

function randomCode(): string {
  return `PARTNER${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function PromoCodeForm({ events }: { events: EventOption[] }) {
  const [state, action, pending] = useActionState(createPromoCode, initialState);
  const [scope, setScope] = useState<"all" | "special" | "event">("special");

  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-poet-gold/20 bg-zinc-950/35 p-4 sm:grid-cols-2 sm:p-5">
      <div className="sm:col-span-2">
        <h2 className="font-display text-lg font-semibold text-zinc-100">Новый промокод</h2>
        <p className="mt-1 text-xs text-zinc-500">Партнёрская ссылка будет вида <code>?promo=КОД</code>.</p>
      </div>
      {state?.error ? <p className="sm:col-span-2 text-sm text-red-400">{state.error}</p> : null}
      {state?.ok ? <p className="sm:col-span-2 text-sm text-emerald-300">{state.ok}</p> : null}
      <label className="block text-sm text-zinc-300">
        Код
        <div className="mt-1 flex gap-2">
          <input name="code" required className="min-w-0 flex-1 rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 font-mono text-white" placeholder="NEXTMODE15" />
          <button type="button" onClick={(e) => {
            const form = e.currentTarget.form;
            const input = form?.elements.namedItem("code");
            if (input instanceof HTMLInputElement) input.value = randomCode();
          }} className="rounded-xl border border-poet-gold/25 px-3 text-xs text-poet-gold hover:border-poet-gold/60">Сгенерировать</button>
        </div>
      </label>
      <label className="block text-sm text-zinc-300">
        Партнёр
        <input name="partnerName" required className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white" placeholder="Имя / канал" />
      </label>
      <label className="block text-sm text-zinc-300">
        Скидка, %
        <input name="discountPercent" type="number" min="1" max="99" required defaultValue="10" className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white" />
      </label>
      <label className="block text-sm text-zinc-300">
        Применимость
        <select name="scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white">
          <option value="special">Только special-события</option>
          <option value="all">Все события</option>
          <option value="event">Конкретное событие</option>
        </select>
      </label>
      <label className="block text-sm text-zinc-300">
        Событие для ограничения {scope === "event" ? "*" : ""}
        <select name="eventId" required={scope === "event"} className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white">
          <option value="">—</option>
          {events.map((event) => <option key={event.id} value={event.id}>{event.title} · {event.slug}</option>)}
        </select>
      </label>
      <label className="block text-sm text-zinc-300">
        Событие для партнёрской ссылки
        <select name="landingEventId" className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white">
          <option value="">— выбрать позднее —</option>
          {events.map((event) => <option key={event.id} value={event.id}>{event.title} · {event.slug}</option>)}
        </select>
      </label>
      <label className="block text-sm text-zinc-300">
        Лимит использований
        <input name="maxRedemptions" type="number" min="1" className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white" placeholder="Без лимита" />
      </label>
      <label className="block text-sm text-zinc-300">
        Действует с
        <input name="startsAt" type="datetime-local" className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white" />
      </label>
      <label className="block text-sm text-zinc-300">
        Действует до
        <input name="endsAt" type="datetime-local" className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white" />
      </label>
      <button type="submit" disabled={pending} className="btn-poet poet-shine justify-self-start px-5 py-2 text-sm disabled:opacity-50">
        {pending ? "Создаём…" : "Создать промокод"}
      </button>
    </form>
  );
}

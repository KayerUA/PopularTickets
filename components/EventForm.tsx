"use client";

import { useActionState } from "react";
import { upsertEvent, type UpsertEventState } from "@/app/actions/admin-events";
import { toDatetimeLocalValue } from "@/lib/datetime";

export type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  maps_url?: string | null;
  venue: string;
  starts_at: string;
  price_grosze: number;
  total_tickets: number;
  is_published: boolean;
};

const initialUpsertState: UpsertEventState = null;

export function EventForm({ event }: { event?: AdminEventRow }) {
  const pricePlnDefault = event ? (event.price_grosze / 100).toFixed(2) : "50.00";
  const [state, formAction, pending] = useActionState(upsertEvent, initialUpsertState);

  return (
    <form action={formAction} encType="multipart/form-data" className="max-w-2xl space-y-5">
      {state?.error ? (
        <p
          className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-zinc-300 sm:col-span-2">
          Slug (URL)
          <input
            name="slug"
            required
            defaultValue={event?.slug}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 font-mono text-sm text-white"
            placeholder="vecher-na-warsaw"
          />
        </label>
        <label className="block text-sm text-zinc-300 sm:col-span-2">
          Название
          <input
            name="title"
            required
            defaultValue={event?.title}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-zinc-300 sm:col-span-2">
          Описание
          <textarea
            name="description"
            rows={6}
            defaultValue={event?.description ?? ""}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <div className="space-y-2 sm:col-span-2">
          <label className="block text-sm text-zinc-300">
            Обложка события
            <input
              name="imageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-poet-gold/20 file:px-3 file:py-1.5 file:text-poet-gold"
            />
          </label>
          <p className="text-xs text-zinc-500">
            Загрузка в Supabase Storage (до 5 МБ). Бакет <code className="font-mono">event-images</code> создаётся
            автоматически при первой загрузке (если ключ — service role). Дополнительно можно выполнить SQL{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-zinc-400">supabase/storage-event-images.sql</code>{" "}
            (политика чтения).
          </p>
          <label className="block text-sm text-zinc-300">
            Или ссылка / путь (опционально)
            <input
              name="imageUrl"
              defaultValue={event?.image_url ?? ""}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
              placeholder="https://… или /events/файл.png с этого сайта"
            />
          </label>
        </div>
        <label className="block text-sm text-zinc-300 sm:col-span-2">
          Ссылка на карту (Google Maps, опционально)
          <input
            name="mapsUrl"
            type="url"
            defaultValue={event?.maps_url ?? ""}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            placeholder="https://maps.app.goo.gl/..."
          />
        </label>
        <label className="block text-sm text-zinc-300 sm:col-span-2">
          Место
          <input
            name="venue"
            required
            defaultValue={event?.venue}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Дата и время
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={event ? toDatetimeLocalValue(event.starts_at) : undefined}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Цена, PLN
          <input
            name="pricePln"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            defaultValue={pricePlnDefault}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Всего билетов
          <input
            name="totalTickets"
            type="number"
            min={1}
            max={5000}
            required
            defaultValue={event?.total_tickets ?? 100}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
          <input type="checkbox" name="isPublished" defaultChecked={event?.is_published ?? false} />
          Опубликовать на главной
        </label>
      </div>
      <button type="submit" disabled={pending} className="btn-poet poet-shine px-8 disabled:opacity-50">
        {pending ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}

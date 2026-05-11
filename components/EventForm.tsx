import { upsertEvent } from "@/app/actions/admin-events";
import { toDatetimeLocalValue } from "@/lib/datetime";

export type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  venue: string;
  starts_at: string;
  price_grosze: number;
  total_tickets: number;
  is_published: boolean;
};

export function EventForm({ event }: { event?: AdminEventRow }) {
  const pricePlnDefault = event ? (event.price_grosze / 100).toFixed(2) : "50.00";

  return (
    <form action={upsertEvent} className="max-w-2xl space-y-5">
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
        <label className="block text-sm text-zinc-300 sm:col-span-2">
          URL картинки (опционально)
          <input
            name="imageUrl"
            defaultValue={event?.image_url ?? ""}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            placeholder="https://..."
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
      <button
        type="submit"
        className="btn-poet poet-shine px-8"
      >
        Сохранить
      </button>
    </form>
  );
}

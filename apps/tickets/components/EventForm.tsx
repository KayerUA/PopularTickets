"use client";

import { useActionState, useState } from "react";
import { upsertEvent, type UpsertEventState } from "@/app/actions/admin-events";
import { toDatetimeLocalValue } from "@/lib/datetime";
import type { PoetCourseSelectOption } from "@/lib/fetchPoetCourseSelectOptions";
import { POPULAR_POET_THEATRE_MAPS_URL, POPULAR_POET_TRIAL_VENUE_PL } from "@/lib/theatreVenueDefaults";

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
  listing_kind: "performance" | "trial";
  poet_course_id?: string | null;
};

const initialUpsertState: UpsertEventState = null;

export function EventForm({
  event,
  poetCourseOptions = [],
}: {
  event?: AdminEventRow;
  poetCourseOptions?: PoetCourseSelectOption[];
}) {
  const pricePlnDefault = event ? (event.price_grosze / 100).toFixed(2) : "50.00";
  const [state, formAction, pending] = useActionState(upsertEvent, initialUpsertState);
  const [listingKind, setListingKind] = useState<"performance" | "trial">(event?.listing_kind ?? "performance");

  const venueFieldKey = event ? `venue-${event.id}` : `venue-${listingKind}`;
  const mapsFieldKey = event ? `maps-${event.id}` : `maps-${listingKind}`;

  const defaultVenue =
    event?.venue ?? (listingKind === "trial" && !event ? POPULAR_POET_TRIAL_VENUE_PL : "");
  const defaultMaps =
    event?.maps_url ?? (listingKind === "trial" && !event ? POPULAR_POET_THEATRE_MAPS_URL : "");

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
          Тип публикации
          <select
            name="listingKind"
            defaultValue={event?.listing_kind ?? "performance"}
            onChange={(e) => setListingKind(e.target.value === "trial" ? "trial" : "performance")}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
          >
            <option value="performance">Спектакль / шоу — афиша PopularTickets</option>
            <option value="trial">Пробный урок — календарь на popularpoet.pl, оплата на этом событии</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Пробные не показываются на главной PopularTickets. На popularpoet.pl слот появится только если включено «Опубликовать» и выбран тип «Пробный урок». Привязка к курсу — после SQL{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-zinc-400">add-events-poet-course-id-column.sql</code>{" "}
            (или полный <code className="rounded bg-zinc-900 px-1 font-mono text-zinc-400">add-poet-course-masterclass-and-event-fk.sql</code>
            ); если после SQL ошибка про schema cache — в Supabase: Settings → API → Reload schema.
          </p>
        </label>
        {listingKind === "trial" && !event ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-xs text-amber-100/95 sm:col-span-2">
            Чтобы событие сразу попало в календарь пробных на popularpoet.pl, отметьте галочку «Опубликовать» перед сохранением.
          </p>
        ) : null}
        {listingKind === "trial" && poetCourseOptions.length > 0 ? (
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Курс на popularpoet.pl (страница курса и календарь)
            <select
              name="poetCourseId"
              defaultValue={event?.poet_course_id ?? ""}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            >
              <option value="">— без привязки к курсу —</option>
              {poetCourseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.slug})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Если выбрать курс, в календаре появится ссылка на страницу этого курса; сами пробные всё равно проходят в театре по адресу ниже (по умолчанию подставляется польский адрес).
            </p>
          </label>
        ) : null}
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
            автоматически при первой загрузке (service role). Поле «карта» в БД — после SQL{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-zinc-400">supabase/add-maps-url.sql</code>{" "}
            (RPC <code className="font-mono">pt_event_*</code>). Storage:{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-zinc-400">supabase/storage-event-images.sql</code>.
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
            key={mapsFieldKey}
            name="mapsUrl"
            type="url"
            defaultValue={defaultMaps}
            className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            placeholder="https://maps.app.goo.gl/..."
          />
        </label>
        <label className="block text-sm text-zinc-300 sm:col-span-2">
          Место проведения (адрес не переводите — для пробных по умолчанию польский адрес театра)
          <input
            key={venueFieldKey}
            name="venue"
            required
            defaultValue={defaultVenue}
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
        <label className="flex flex-col gap-1 text-sm text-zinc-300 sm:col-span-2">
          <span className="flex items-center gap-2">
            <input type="checkbox" name="isPublished" defaultChecked={event?.is_published ?? false} />
            Опубликовать
          </span>
          <span className="pl-7 text-xs text-zinc-500">
            Для спектакля / шоу — в афише PopularTickets; для пробного — в календаре на popularpoet.pl (оплата на этом же slug в кассе).
          </span>
        </label>
      </div>
      <button type="submit" disabled={pending} className="btn-poet poet-shine px-8 disabled:opacity-50">
        {pending ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}

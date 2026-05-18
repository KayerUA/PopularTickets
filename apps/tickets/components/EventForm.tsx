"use client";

import { useActionState, useEffect, useState } from "react";
import { upsertEvent, type UpsertEventRetryFields, type UpsertEventState } from "@/app/actions/admin-events";
import { toDatetimeLocalValue } from "@/lib/datetime";
import type { PoetCourseSelectOption } from "@/lib/fetchPoetCourseSelectOptions";
import { POPULAR_POET_THEATRE_MAPS_URL, POPULAR_POET_TRIAL_VENUE_PL } from "@/lib/theatreVenueDefaults";
import type { ContentVisibility } from "@/lib/contentVisibility";
import { EventCoverFocalControls } from "@/components/EventCoverFocalControls";
import { clampEventImageFocal } from "@/lib/eventCoverFocal";
import { slugifyEventTitle } from "@/lib/eventSlugFromTitle";

export type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_focal_x?: number;
  image_focal_y?: number;
  maps_url?: string | null;
  venue: string;
  starts_at: string;
  price_grosze: number;
  total_tickets: number;
  visibility: ContentVisibility;
  listing_kind: "performance" | "trial";
  poet_course_id?: string | null;
};

const initialUpsertState: UpsertEventState = null;

function mergeRetryDefaults(
  event: AdminEventRow | undefined,
  fields: UpsertEventRetryFields | undefined,
): {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  mapsUrl: string;
  venue: string;
  startsAt: string;
  pricePln: string;
  totalTickets: string;
  visibility: ContentVisibility;
  listingKind: "performance" | "trial";
  poetCourseId: string;
  imageFocalX: string;
  imageFocalY: string;
} {
  const lk = (fields?.listingKind ?? event?.listing_kind ?? "performance") as "performance" | "trial";
  return {
    slug: fields?.slug ?? event?.slug ?? "",
    title: fields?.title ?? event?.title ?? "",
    description: fields?.description ?? event?.description ?? "",
    imageUrl: fields?.imageUrl ?? event?.image_url ?? "",
    mapsUrl:
      fields?.mapsUrl ??
      event?.maps_url ??
      (lk === "trial" && !event ? POPULAR_POET_THEATRE_MAPS_URL : ""),
    venue:
      fields?.venue ??
      event?.venue ??
      (lk === "trial" && !event ? POPULAR_POET_TRIAL_VENUE_PL : ""),
    startsAt: fields?.startsAt ?? (event ? toDatetimeLocalValue(event.starts_at) : ""),
    pricePln: fields?.pricePln ?? (event ? (event.price_grosze / 100).toFixed(2) : "50.00"),
    totalTickets: fields?.totalTickets ?? String(event?.total_tickets ?? 100),
    visibility: (fields?.visibility ?? event?.visibility ?? "inactive") as ContentVisibility,
    listingKind: lk,
    poetCourseId: fields?.poetCourseId ?? event?.poet_course_id ?? "",
    imageFocalX: fields?.imageFocalX ?? String(event?.image_focal_x ?? 50),
    imageFocalY: fields?.imageFocalY ?? String(event?.image_focal_y ?? 50),
  };
}

function AdminFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-poet-gold/15 bg-zinc-950/40 p-4 sm:p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-poet-gold/70">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function EventForm({
  event,
  poetCourseOptions = [],
}: {
  event?: AdminEventRow;
  poetCourseOptions?: PoetCourseSelectOption[];
}) {
  const [state, formAction, pending] = useActionState(upsertEvent, initialUpsertState);
  const d = mergeRetryDefaults(event, state?.fields);
  const [listingKind, setListingKind] = useState<"performance" | "trial">(d.listingKind);

  const [imageUrlDraft, setImageUrlDraft] = useState(d.imageUrl);
  const [blobPreview, setBlobPreview] = useState<string | null>(null);

  useEffect(() => {
    if (state?.fields) {
      setListingKind(state.fields.listingKind);
      setImageUrlDraft(state.fields.imageUrl);
    }
  }, [state?.nonce, state?.fields]);

  useEffect(() => {
    return () => {
      if (blobPreview) URL.revokeObjectURL(blobPreview);
    };
  }, [blobPreview]);

  const trimmedDraft = imageUrlDraft.trim();
  const trimmedSavedUrl = (event?.image_url ?? d.imageUrl)?.trim();
  const coverPreviewUrl: string | null =
    blobPreview ?? (trimmedDraft ? trimmedDraft : null) ?? (trimmedSavedUrl ? trimmedSavedUrl : null);

  const venueFieldKey = event ? `venue-${event.id}` : `venue-${listingKind}-${state?.nonce ?? "0"}`;
  const mapsFieldKey = event ? `maps-${event.id}` : `maps-${listingKind}-${state?.nonce ?? "0"}`;

  const formInstanceKey = state?.nonce ?? `evt-${event?.id ?? "new"}`;

  return (
    <form
      key={formInstanceKey}
      action={formAction}
      encType="multipart/form-data"
      className="max-w-2xl space-y-5"
    >
      {state?.error ? (
        <p
          className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <div className="space-y-5">
        <AdminFormSection title="Основное">
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Slug (URL)
            <input
              id="admin-event-slug"
              name="slug"
              required={Boolean(event)}
              defaultValue={d.slug}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 font-mono text-sm text-white"
              placeholder={event ? "vecher-na-warsaw" : "пусто — из названия"}
            />
            {!event ? (
              <p className="mt-1 text-xs text-zinc-500">
                Если оставить пустым, slug соберётся из названия (латиница). При занятом адресе добавим суффикс -2, -3…
              </p>
            ) : null}
          </label>
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Название
            <input
              id="admin-event-title"
              name="title"
              required
              defaultValue={d.title}
              onBlur={() => {
                if (event) return;
                const slugEl = document.getElementById("admin-event-slug") as HTMLInputElement | null;
                const titleEl = document.getElementById("admin-event-title") as HTMLInputElement | null;
                if (!slugEl || !titleEl) return;
                if (slugEl.value.trim() !== "") return;
                slugEl.value = slugifyEventTitle(titleEl.value);
              }}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Тип публикации
            <select
              name="listingKind"
              defaultValue={d.listingKind}
              onChange={(e) => setListingKind(e.target.value === "trial" ? "trial" : "performance")}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            >
              <option value="performance">Спектакль / шоу — афиша PopularTickets</option>
              <option value="trial">Пробный урок — календарь на popularpoet.pl</option>
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Пробные не на главной PopularTickets. Слот на popularpoet.pl — при типе «Пробный» и видимости «Опубликован».
            </p>
          </label>
          {listingKind === "trial" && !event ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-xs text-amber-100/95 sm:col-span-2">
              Для появления в календаре пробных выберите ниже «Опубликован».
            </p>
          ) : null}
          {listingKind === "trial" && poetCourseOptions.length > 0 ? (
            <label className="block text-sm text-zinc-300 sm:col-span-2">
              Курс (popularpoet.pl)
              <select
                name="poetCourseId"
                defaultValue={d.poetCourseId}
                className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
              >
                <option value="">— без привязки —</option>
                {poetCourseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.slug})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">Необязательно: ссылка на курс в календаре. Занятие всё равно по адресу ниже.</p>
            </label>
          ) : null}
        </AdminFormSection>

        <AdminFormSection title="Описание и обложка">
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Описание
            <textarea
              name="description"
              rows={6}
              defaultValue={d.description}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>
          <div className="space-y-2 sm:col-span-2">
            <label className="block text-sm text-zinc-300">
              Обложка (файл)
              <input
                name="imageFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setBlobPreview((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return f ? URL.createObjectURL(f) : null;
                  });
                }}
                className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-poet-gold/20 file:px-3 file:py-1.5 file:text-poet-gold"
              />
            </label>
            <p className="text-xs text-zinc-500">До 5 МБ. Или вставьте ссылку / путь ниже — без файла.</p>
            <label className="block text-sm text-zinc-300">
              Ссылка на картинку (необязательно)
              <input
                name="imageUrl"
                value={imageUrlDraft}
                onChange={(e) => setImageUrlDraft(e.target.value)}
                className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
                placeholder="https://… или /events/…"
              />
            </label>
            <EventCoverFocalControls
              previewUrl={coverPreviewUrl}
              initialX={clampEventImageFocal(Number(d.imageFocalX))}
              initialY={clampEventImageFocal(Number(d.imageFocalY))}
            />
          </div>
        </AdminFormSection>

        <AdminFormSection title="Место, время, билеты">
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Карта (Google Maps, по желанию)
            <input
              key={mapsFieldKey}
              name="mapsUrl"
              type="url"
              defaultValue={d.mapsUrl}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
              placeholder="https://maps.app.goo.gl/..."
            />
          </label>
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Адрес / место
            <input
              key={venueFieldKey}
              name="venue"
              required
              defaultValue={d.venue}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Дата и время
            <input
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={d.startsAt || undefined}
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
              defaultValue={d.pricePln}
              className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Всего билетов
            <input
              name="totalTickets"
              type="number"
              min={1}
              max={5000}
              required
              defaultValue={d.totalTickets}
              className="mt-1 w-full max-w-xs rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>
        </AdminFormSection>

        <AdminFormSection title="Видимость">
          <fieldset className="space-y-2 sm:col-span-2">
            <legend className="sr-only">Видимость события</legend>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-poet-gold/15 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 has-[:checked]:border-poet-gold/40">
              <input
                type="radio"
                name="visibility"
                value="published"
                className="mt-1"
                defaultChecked={d.visibility === "published"}
              />
              <span>
                <span className="font-medium text-zinc-100">Опубликован</span>
                <span className="mt-0.5 block text-xs text-zinc-500">Афиша и/или календарь пробных.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-poet-gold/15 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 has-[:checked]:border-poet-gold/40">
              <input
                type="radio"
                name="visibility"
                value="unlisted"
                className="mt-1"
                defaultChecked={d.visibility === "unlisted"}
              />
              <span>
                <span className="font-medium text-zinc-100">Только по ссылке</span>
                <span className="mt-0.5 block text-xs text-zinc-500">Не в списках; страница открывается по URL.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-poet-gold/15 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 has-[:checked]:border-poet-gold/40">
              <input
                type="radio"
                name="visibility"
                value="inactive"
                className="mt-1"
                defaultChecked={d.visibility === "inactive"}
              />
              <span>
                <span className="font-medium text-zinc-100">Не активен</span>
                <span className="mt-0.5 block text-xs text-zinc-500">Скрыто с сайта, оплата недоступна.</span>
              </span>
            </label>
          </fieldset>
        </AdminFormSection>

        <details className="rounded-xl border border-zinc-700/60 bg-zinc-900/30 text-sm text-zinc-400">
          <summary className="cursor-pointer select-none px-4 py-3 font-medium text-zinc-300 hover:text-zinc-200">
            Для разработчика: SQL, Storage, кэш Supabase
          </summary>
          <div className="space-y-3 border-t border-zinc-800 px-4 py-3 text-xs leading-relaxed text-zinc-500">
            <p>
              Привязка события к курсу: SQL в репозитории{" "}
              <code className="rounded bg-zinc-900 px-1 font-mono text-zinc-400">add-events-poet-course-id-column.sql</code>{" "}
              или{" "}
              <code className="rounded bg-zinc-900 px-1 font-mono text-zinc-400">add-poet-course-masterclass-and-event-fk.sql</code>
              . После SQL при ошибке schema cache: Supabase → Settings → API → Reload schema.
            </p>
            <p>
              Поле карты в БД: <code className="font-mono">supabase/add-maps-url.sql</code> (RPC{" "}
              <code className="font-mono">pt_event_*</code>). Обложки: <code className="font-mono">supabase/storage-event-images.sql</code>
              , бакет <code className="font-mono">event-images</code>.
            </p>
          </div>
        </details>
      </div>
      <button type="submit" disabled={pending} className="btn-poet poet-shine px-8 disabled:opacity-50">
        {pending ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}

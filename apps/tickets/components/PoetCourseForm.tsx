"use client";

import { useActionState } from "react";
import { upsertPoetCourse, type UpsertPoetCourseState } from "@/app/actions/poet-courses";
import type { ContentVisibility } from "@/lib/contentVisibility";

export type AdminPoetCourseRow = {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  visibility: ContentVisibility;
  sort_order: number;
  card_image_url: string;
  hero_image_url: string | null;
  card_variant: string;
  card_tag: string;
};

const initialState: UpsertPoetCourseState = null;

const CARD_VARIANT_OPTIONS = [
  { value: "improv", label: "Импро (золотой акцент)" },
  { value: "acting", label: "Актёрское (изумрудный)" },
  { value: "masterclass", label: "Мастер-класс (бордо)" },
  { value: "playback", label: "PLAY-BACK (индиго)" },
] as const;

export function PoetCourseForm({ course }: { course?: AdminPoetCourseRow }) {
  const [state, formAction, pending] = useActionState(upsertPoetCourse, initialState);
  const defaultVisibility: ContentVisibility = course?.visibility ?? "inactive";

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state?.error ? (
        <p className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
          {state.error}
        </p>
      ) : null}
      {course ? <input type="hidden" name="id" value={course.id} /> : null}
      <label className="block text-sm text-zinc-300">
        Slug (на popularpoet.pl и в базе)
        <input
          name="slug"
          required
          defaultValue={course?.slug}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 font-mono text-sm text-white"
          placeholder="kurs-impro"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Название на сайте
        <input
          name="title"
          required
          defaultValue={course?.title}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Картинка карточки (URL или путь, напр. <code className="font-mono text-zinc-500">/courses/impro.jpg</code>)
        <input
          name="cardImageUrl"
          required
          defaultValue={course?.card_image_url ?? "/courses/theatre.jpg"}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 font-mono text-sm text-white"
          placeholder="/courses/impro.jpg"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Картинка на странице курса (если пусто — как в карточке)
        <input
          name="heroImageUrl"
          defaultValue={course?.hero_image_url ?? ""}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 font-mono text-sm text-white"
          placeholder="оставьте пустым или укажите URL"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Стиль карточки (цвет рамки / градиент на popularpoet.pl)
        <select
          name="cardVariant"
          defaultValue={course?.card_variant ?? "improv"}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        >
          {CARD_VARIANT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-zinc-300">
        Короткая метка над названием (например «Импро»; можно пусто)
        <input
          name="cardTag"
          defaultValue={course?.card_tag ?? ""}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
          placeholder=""
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Текст на карточке
        <textarea
          name="body"
          rows={6}
          defaultValue={course?.body ?? ""}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Порядок (меньше — выше в списке)
        <input
          name="sortOrder"
          type="number"
          min={0}
          max={9999}
          defaultValue={course?.sort_order ?? 0}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm text-zinc-300">Видимость на popularpoet.pl</legend>
        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-poet-gold/15 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 has-[:checked]:border-poet-gold/40">
          <input
            type="radio"
            name="visibility"
            value="published"
            className="mt-1"
            defaultChecked={defaultVisibility === "published"}
          />
          <span>
            <span className="font-medium text-zinc-100">Опубликован</span>
            <span className="mt-0.5 block text-xs text-zinc-500">Главная и блок курсов.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-poet-gold/15 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 has-[:checked]:border-poet-gold/40">
          <input
            type="radio"
            name="visibility"
            value="unlisted"
            className="mt-1"
            defaultChecked={defaultVisibility === "unlisted"}
          />
          <span>
            <span className="font-medium text-zinc-100">Только по ссылке</span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Не в списках; страница /kursy/… открывается по прямой ссылке.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-poet-gold/15 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 has-[:checked]:border-poet-gold/40">
          <input
            type="radio"
            name="visibility"
            value="inactive"
            className="mt-1"
            defaultChecked={defaultVisibility === "inactive"}
          />
          <span>
            <span className="font-medium text-zinc-100">Не активен</span>
            <span className="mt-0.5 block text-xs text-zinc-500">Страница курса на Poet недоступна.</span>
          </span>
        </label>
      </fieldset>
      <button type="submit" disabled={pending} className="btn-poet poet-shine px-8 disabled:opacity-50">
        {pending ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}

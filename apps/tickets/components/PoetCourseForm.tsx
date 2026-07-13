"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { upsertPoetCourse, type UpsertPoetCourseState } from "@/app/actions/poet-courses";
import type { ContentVisibility } from "@/lib/contentVisibility";
import { AdminTranslateLocalesButton, type LocaleFields } from "@/components/AdminTranslateLocalesButton";

export type AdminPoetCourseRow = {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  title_pl?: string | null;
  body_pl?: string | null;
  title_uk?: string | null;
  body_uk?: string | null;
  card_tag_pl?: string | null;
  card_tag_uk?: string | null;
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

export function PoetCourseForm({
  course,
  translateProviderHint,
}: {
  course?: AdminPoetCourseRow;
  translateProviderHint?: string;
}) {
  const [state, formAction, pending] = useActionState(upsertPoetCourse, initialState);
  const router = useRouter();
  const defaultVisibility: ContentVisibility = course?.visibility ?? "inactive";
  const courseId = course?.id;
  const courseTitlePl = course?.title_pl ?? "";
  const courseBodyPl = course?.body_pl ?? "";
  const courseTitleUk = course?.title_uk ?? "";
  const courseBodyUk = course?.body_uk ?? "";
  const courseCardTagPl = course?.card_tag_pl ?? "";
  const courseCardTagUk = course?.card_tag_uk ?? "";

  const [locales, setLocales] = useState<LocaleFields>({
    title_pl: courseTitlePl,
    body_pl: courseBodyPl,
    title_uk: courseTitleUk,
    body_uk: courseBodyUk,
    card_tag_pl: courseCardTagPl,
    card_tag_uk: courseCardTagUk,
  });

  useEffect(() => {
    if (state?.redirectTo) router.push(state.redirectTo);
  }, [state?.redirectTo, router]);

  useEffect(() => {
    if (!courseId) return;
    setLocales({
      title_pl: courseTitlePl,
      body_pl: courseBodyPl,
      title_uk: courseTitleUk,
      body_uk: courseBodyUk,
      card_tag_pl: courseCardTagPl,
      card_tag_uk: courseCardTagUk,
    });
  }, [courseId, courseTitlePl, courseBodyPl, courseTitleUk, courseBodyUk, courseCardTagPl, courseCardTagUk]);

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
        Название (русский, основной)
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
        Короткая метка над названием (русский, напр. «Импро»)
        <input
          name="cardTag"
          defaultValue={course?.card_tag ?? ""}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
          placeholder=""
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Текст на карточке (русский)
        <textarea
          name="body"
          rows={6}
          defaultValue={course?.body ?? ""}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>

      <AdminTranslateLocalesButton
        readSource={() => {
          const titleEl = document.querySelector<HTMLInputElement>('input[name="title"]');
          const bodyEl = document.querySelector<HTMLTextAreaElement>('textarea[name="body"]');
          const tagEl = document.querySelector<HTMLInputElement>('input[name="cardTag"]');
          return {
            title: titleEl?.value ?? course?.title ?? "",
            body: bodyEl?.value ?? course?.body ?? "",
            cardTag: tagEl?.value ?? course?.card_tag ?? "",
          };
        }}
        localeFields={locales}
        onLocalesChange={setLocales}
        includeCardTag
        providerHint={translateProviderHint}
      />

      <label className="block text-sm text-zinc-300">
        Название (polski) — /pl/
        <input
          name="titlePl"
          value={locales.title_pl}
          onChange={(e) => setLocales((p) => ({ ...p, title_pl: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Etykieta kafelka (polski)
        <input
          name="cardTagPl"
          value={locales.card_tag_pl ?? ""}
          onChange={(e) => setLocales((p) => ({ ...p, card_tag_pl: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Tekst na kafelku (polski)
        <textarea
          name="bodyPl"
          rows={5}
          value={locales.body_pl}
          onChange={(e) => setLocales((p) => ({ ...p, body_pl: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Название (українська) — /uk/
        <input
          name="titleUk"
          value={locales.title_uk}
          onChange={(e) => setLocales((p) => ({ ...p, title_uk: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Мітка (українська)
        <input
          name="cardTagUk"
          value={locales.card_tag_uk ?? ""}
          onChange={(e) => setLocales((p) => ({ ...p, card_tag_uk: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Текст (українська)
        <textarea
          name="bodyUk"
          rows={4}
          value={locales.body_uk}
          onChange={(e) => setLocales((p) => ({ ...p, body_uk: e.target.value }))}
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

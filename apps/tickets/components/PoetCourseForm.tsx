"use client";

import { useActionState } from "react";
import { upsertPoetCourse, type UpsertPoetCourseState } from "@/app/actions/poet-courses";

export type AdminPoetCourseRow = {
  id: string;
  slug: string;
  title: string;
  kind: "improvisation" | "acting" | "playback" | "other";
  body: string | null;
  is_published: boolean;
  sort_order: number;
};

const initialState: UpsertPoetCourseState = null;

export function PoetCourseForm({ course }: { course?: AdminPoetCourseRow }) {
  const [state, formAction, pending] = useActionState(upsertPoetCourse, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state?.error ? (
        <p className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
          {state.error}
        </p>
      ) : null}
      {course ? <input type="hidden" name="id" value={course.id} /> : null}
      <label className="block text-sm text-zinc-300">
        Slug (на popularpoet.pl / у базі)
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
        Напрямок (для картки й фото)
        <select
          name="kind"
          defaultValue={course?.kind ?? "improvisation"}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        >
          <option value="improvisation">Імпровізація</option>
          <option value="acting">Акторська майстерність</option>
          <option value="playback">PLAY-BACK</option>
          <option value="other">Інше</option>
        </select>
      </label>
      <label className="block text-sm text-zinc-300">
        Текст на картці
        <textarea
          name="body"
          rows={6}
          defaultValue={course?.body ?? ""}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Порядок (менше — вище)
        <input
          name="sortOrder"
          type="number"
          min={0}
          max={9999}
          defaultValue={course?.sort_order ?? 0}
          className="mt-1 w-full rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2 text-white"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-300">
        <span className="flex items-center gap-2">
          <input type="checkbox" name="isPublished" defaultChecked={course?.is_published ?? false} />
          Опубликовать на popularpoet.pl (головна, блок курсів)
        </span>
      </label>
      <button type="submit" disabled={pending} className="btn-poet poet-shine px-8 disabled:opacity-50">
        {pending ? "Збереження…" : "Зберегти"}
      </button>
    </form>
  );
}

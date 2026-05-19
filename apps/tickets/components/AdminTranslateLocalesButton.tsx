"use client";

import { useState, useTransition } from "react";
import { translateContentFromRu } from "@/app/actions/translate-content";

export type LocaleFields = {
  title_pl: string;
  body_pl: string;
  title_uk: string;
  body_uk: string;
  card_tag_pl?: string;
  card_tag_uk?: string;
};

type Props = {
  /** Читает RU-поля из формы перед переводом. */
  readSource: () => { title: string; body: string; cardTag?: string };
  localeFields: LocaleFields;
  onLocalesChange: (next: LocaleFields) => void;
  includeCardTag?: boolean;
  providerHint?: string;
};

export function AdminTranslateLocalesButton({
  readSource,
  localeFields,
  onLocalesChange,
  includeCardTag = false,
  providerHint,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="sm:col-span-2 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setMessage(null);
            const src = readSource();
            startTransition(async () => {
              const res = await translateContentFromRu({
                title: src.title,
                body: src.body,
                cardTag: includeCardTag ? src.cardTag : undefined,
              });
              if (!res.ok) {
                setError(res.error);
                return;
              }
              onLocalesChange({
                title_pl: res.title_pl,
                body_pl: res.body_pl,
                title_uk: res.title_uk,
                body_uk: res.body_uk,
                card_tag_pl: res.card_tag_pl,
                card_tag_uk: res.card_tag_uk,
              });
              setMessage(`Готово (${res.provider}). Проверьте и сохраните форму.`);
            });
          }}
          className="rounded-xl border border-poet-gold/35 bg-poet-gold/10 px-4 py-2 text-sm font-medium text-poet-gold-bright transition hover:bg-poet-gold/20 disabled:opacity-50"
        >
          {pending ? "Перевод…" : "Перевести RU → PL + UK"}
        </button>
        {providerHint ? (
          <span className="text-xs text-zinc-500">Движок: {providerHint}</span>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-xs text-emerald-400/90">{message}</p> : null}
      {!localeFields.title_pl.trim() ? (
        <p className="text-xs text-amber-200/80">
          Для публикации на /pl/ нужен польский заголовок (title_pl). Нажмите перевод или заполните вручную.
        </p>
      ) : null}
    </div>
  );
}

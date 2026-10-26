"use client";

import { useState } from "react";
import { submitEventRating } from "@/app/actions/ratings";
import type { AppLocale } from "@/i18n/routing";
import { ratingText } from "@/lib/ratings/i18n";

export function EventRatingForm({
  token,
  locale,
  preview = false,
}: {
  token: string;
  locale: AppLocale;
  preview?: boolean;
}) {
  const t = ratingText[locale];
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState(false);
  const [error, setError] = useState("");

  if (done) {
    return <p className="text-emerald-300">{already ? t.already : t.thanks}</p>;
  }

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (score < 1) {
          setError(t.choose);
          return;
        }
        setPending(true);
        setError("");
        try {
          if (preview) {
            setDone(true);
            return;
          }
          const result = await submitEventRating({ token, score, comment, locale });
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          setAlready(Boolean(result.already));
          setDone(true);
        } catch {
          setError(t.unavailable);
        } finally {
          setPending(false);
        }
      }}
    >
      <fieldset disabled={pending} className="space-y-3">
        <legend className="text-sm font-medium text-zinc-200">{t.score}</legend>
        <div role="radiogroup" aria-label={t.score} className="flex flex-wrap items-center gap-1">
          {t.scores.map((label, index) => {
            const value = index + 1;
            const filled = score >= value;
            return (
              <label
                key={value}
                title={label}
                className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border text-2xl leading-none transition focus-within:ring-2 focus-within:ring-poet-gold ${
                  filled
                    ? "border-poet-gold bg-poet-gold/15 text-poet-gold-bright"
                    : "border-poet-gold/20 bg-zinc-950/50 text-zinc-600 hover:border-poet-gold/45 hover:text-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="score"
                  value={value}
                  checked={score === value}
                  onChange={() => {
                    setScore(value);
                    if (error) setError("");
                  }}
                  className="sr-only"
                />
                <span aria-hidden>★</span>
                <span className="sr-only">{`${value} — ${label}`}</span>
              </label>
            );
          })}
        </div>
        <p className="text-sm text-zinc-400" aria-live="polite">
          {score > 0 ? t.scores[score - 1] : t.choose}
        </p>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="event-rating-comment" className="text-sm text-zinc-300">
          {t.comment}
        </label>
        <textarea
          id="event-rating-comment"
          value={comment}
          maxLength={1000}
          rows={4}
          disabled={pending}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-xl border border-poet-gold/20 bg-zinc-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-poet-gold/50"
          placeholder={t.commentHint}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending || score < 1} className="btn-poet btn-poet-theatre px-8 py-3">
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}

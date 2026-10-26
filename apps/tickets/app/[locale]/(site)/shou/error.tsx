"use client";

import { useLocale } from "next-intl";
export default function ShowError({ reset }: { reset: () => void }) {
  const locale = useLocale();
  const message = locale === "pl" ? "Nie udało się wczytać wydarzeń." : locale === "uk" ? "Не вдалося завантажити події." : "Не удалось загрузить события.";
  const retry = locale === "pl" ? "Spróbuj ponownie" : locale === "uk" ? "Спробувати ще раз" : "Повторить";
  return <div role="alert" className="mx-auto max-w-3xl p-8 text-zinc-100"><p>{message}</p><button className="mt-4 min-h-11 rounded-lg bg-poet-gold px-5 text-zinc-950" onClick={reset}>{retry}</button></div>;
}

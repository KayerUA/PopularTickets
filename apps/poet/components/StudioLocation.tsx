"use client";

import { useState } from "react";
import type { AppLocale } from "@/i18n/routing";

const copy = {
  ru: { title: "Где проходят занятия", address: "ul. Domaniewska 37, Centrum Biznesowe Zepter, 5 этаж, помещение 42, Варшава", map: "Показать карту Google", reviews: "Отзывы в Google", travel: "Ближайшие станции метро: Wilanowska и Służew." },
  uk: { title: "Де проходять заняття", address: "ul. Domaniewska 37, Centrum Biznesowe Zepter, 5 поверх, приміщення 42, Варшава", map: "Показати карту Google", reviews: "Відгуки в Google", travel: "Найближчі станції метро: Wilanowska та Służew." },
  pl: { title: "Gdzie odbywają się zajęcia", address: "ul. Domaniewska 37, Centrum Biznesowe Zepter, 5 piętro, lokal 42, Warszawa", map: "Pokaż mapę Google", reviews: "Opinie w Google", travel: "Najbliższe stacje metra: Wilanowska i Służew." },
};

export function StudioLocation({ locale }: { locale: AppLocale }) {
  const [open, setOpen] = useState(false);
  const t = copy[locale];
  return <section className="mt-10 border-t border-white/15 pt-6">
    <h2 className="font-display text-2xl text-zinc-100">{t.title}</h2>
    <p className="mt-3 text-zinc-300">Popular Poet · {t.address}</p>
    <p className="mt-2 text-zinc-300">{t.travel}</p>
    <a className="inline-flex min-h-11 items-center text-poet-gold-bright underline" href="tel:+48452203802">+48 452 203 802</a>
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <button type="button" className="min-h-11 text-poet-gold-bright underline" onClick={() => setOpen(true)} aria-expanded={open}>{t.map}</button>
      <a className="inline-flex min-h-11 items-center text-poet-gold-bright underline" href="https://maps.app.goo.gl/BtaKyKYvp6nGZbx37">{locale === "pl" ? "Trasa w Google Maps" : locale === "uk" ? "Маршрут у Google Maps" : "Маршрут в Google Maps"}</a>
    </div>
    {open ? <iframe title={t.title} loading="lazy" src="https://maps.google.com/maps?q=52.1828699,21.0068606&z=17&output=embed" className="mt-4 h-80 w-full rounded-xl border-0" referrerPolicy="no-referrer-when-downgrade" /> : null}
  </section>;
}

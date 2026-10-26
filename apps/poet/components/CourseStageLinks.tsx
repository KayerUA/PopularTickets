import type { AppLocale } from "@/i18n/routing";
import { getTicketsSiteBase } from "@/lib/ticketsSite";

const copy = {
  ru: { improv: "Наши импро-шоу", acting: "Спектакли нашего театра" },
  uk: { improv: "Наші імпровізаційні шоу", acting: "Вистави нашого театру" },
  pl: { improv: "Nasze show impro", acting: "Spektakle naszego teatru" },
};

export function CourseStageLinks({ locale, slug }: { locale: AppLocale; slug: string }) {
  if (slug !== "improv" && slug !== "acting") return null;
  const t = copy[locale];
  const base = getTicketsSiteBase();
  const shows = slug === "acting" ? [["boing-boing", "Боинг-Боинг"], ["truffaldino-iz-bergamo", "Труффальдино из Бергамо"]] : [["pimpro", "P!MPRO"], ["noga-v-nogu", "Нога в ногу"], ["popular-improv", "Popular Improv"]];
  if (!base) return null;
  return <nav className="mt-12" aria-label={t[slug]}>
    <p className="text-sm text-zinc-300">{t[slug]}</p>
    <ul className="mt-1 flex flex-wrap gap-x-6">{shows.map(([path, title]) => <li key={path}><a className="inline-flex min-h-11 items-center text-poet-gold-bright underline decoration-poet-gold/40 underline-offset-4 hover:decoration-poet-gold" href={`${base}/${locale}/shou/${path}`}>{title}</a></li>)}</ul>
  </nav>;
}

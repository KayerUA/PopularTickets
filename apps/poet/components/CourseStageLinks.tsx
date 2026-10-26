import type { AppLocale } from "@/i18n/routing";
import { getTicketsSiteBase } from "@/lib/ticketsSite";

const copy = {
  ru: { title: "Посмотреть театр на сцене", intro: "Шоу и спектакли Popular Poet. Это репертуар театра, а не перечень выпускных работ курса.", speech: "Голос, дикция и публичные выступления", body: "Отдельного курса ораторского мастерства у нас нет. В актёрском курсе занятия 1–4 включают речь, дикцию и интонации, а занятия 5–8 включают игру на сцене и работу на камеру. Эти упражнения помогают практиковать речь перед людьми." },
  uk: { title: "Побачити театр на сцені", intro: "Шоу та вистави Popular Poet. Це репертуар театру, а не перелік випускних робіт курсу.", speech: "Голос, дикція та публічні виступи", body: "Окремого курсу ораторської майстерності у нас немає. В акторському курсі заняття 1–4 охоплюють мовлення, дикцію та інтонації, а заняття 5–8 включають гру на сцені й роботу на камеру. Ці вправи допомагають практикувати мовлення перед людьми." },
  pl: { title: "Zobacz teatr na scenie", intro: "Show i spektakle Popular Poet. To repertuar teatru, a nie lista przedstawień dyplomowych kursu.", speech: "Głos, dykcja i wystąpienia publiczne", body: "Nie prowadzimy osobnego kursu wystąpień publicznych. Zajęcia 1–4 kursu aktorskiego obejmują mowę, dykcję i intonację, a zajęcia 5–8 grę na scenie i pracę przed kamerą. Te ćwiczenia pozwalają praktykować mówienie przed ludźmi." },
};

export function CourseStageLinks({ locale, slug }: { locale: AppLocale; slug: string }) {
  if (slug !== "improv" && slug !== "acting") return null;
  const t = copy[locale];
  const base = getTicketsSiteBase();
  const shows = slug === "acting" ? [["boing-boing", "Боинг-Боинг"], ["truffaldino-iz-bergamo", "Труффальдино из Бергамо"]] : [["pimpro", "P!MPRO"], ["noga-v-nogu", "Нога в ногу"], ["popular-improv", "Popular Improv"]];
  return <section className="mt-10 border-t border-white/15 pt-6">
    {slug === "acting" ? <><h2 className="font-display text-2xl text-zinc-100">{t.speech}</h2><p className="mt-3 max-w-3xl leading-relaxed text-zinc-300">{t.body}</p></> : null}
    <h2 className="mt-6 font-display text-2xl text-zinc-100">{t.title}</h2>
    <p className="mt-3 text-zinc-300">{t.intro}</p>
    <ul className="mt-3 flex flex-wrap gap-x-6">{shows.map(([path, title]) => <li key={path}><a className="inline-flex min-h-11 items-center text-poet-gold-bright underline" href={`${base}/${locale}/shou/${path}`}>{title}</a></li>)}</ul>
  </section>;
}

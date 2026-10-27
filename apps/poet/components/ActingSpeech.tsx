import type { AppLocale } from "@/i18n/routing";
const copy = {
  ru: { title: "Ораторское мастерство", body: "Тренируем дикцию, интонацию и громкость голоса. Играем сцены перед группой и работаем на камеру: пробуем разные способы говорить, двигаться и удерживать внимание зрителя." },
  uk: { title: "Ораторська майстерність", body: "Тренуємо дикцію, інтонацію та гучність голосу. Граємо сцени перед групою і працюємо на камеру: пробуємо різні способи говорити, рухатися та утримувати увагу глядача." },
  pl: { title: "Wystąpienia publiczne", body: "Ćwiczymy dykcję, intonację i głośność głosu. Gramy sceny przed grupą i pracujemy przed kamerą: próbujemy różnych sposobów mówienia, poruszania się i utrzymywania uwagi widza." },
};
export function ActingSpeech({ locale }: { locale: AppLocale }) {
  const t = copy[locale];
  return <section className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-7"><h2 className="font-display text-xl text-zinc-100">{t.title}</h2><p className="max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">{t.body}</p></section>;
}

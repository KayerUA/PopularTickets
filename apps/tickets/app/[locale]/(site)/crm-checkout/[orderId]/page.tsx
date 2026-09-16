import { notFound } from "next/navigation";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import {
  crmCheckoutPresentation,
  crmP24Url,
  crmReservationExpiresAt,
} from "@/lib/crmCheckout";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const copy = {
  pl: {
    poetPackage: "Popular Poet · abonament",
    poetTrial: "Popular Poet · zajęcia próbne",
    poetEvent: "Popular Poet · wydarzenie",
    ideaTrial: "IDEA · płatność za zajęcia próbne",
    secure: "Bezpieczna płatność przez Przelewy24.",
    pay: "Zapłać przez Przelewy24",
    expiredIdea: "Rezerwacja miejsca wygasła. Wróć do IDEA i wybierz termin ponownie.",
    expiredPoet: "Czas na płatność minął. Wróć do konta i otwórz płatność ponownie.",
    backIdea: "Wróć do IDEA",
    backPoet: "Wróć do konta",
    numberLocale: "pl-PL",
  },
  uk: {
    poetPackage: "Popular Poet · абонемент",
    poetTrial: "Popular Poet · пробне заняття",
    poetEvent: "Popular Poet · подія",
    ideaTrial: "IDEA · оплата пробного заняття",
    secure: "Безпечна оплата через Przelewy24.",
    pay: "Оплатити через Przelewy24",
    expiredIdea: "Час резервування місця минув. Поверніться до IDEA та оберіть дату ще раз.",
    expiredPoet: "Час на оплату минув. Поверніться в кабінет і відкрийте оплату ще раз.",
    backIdea: "Повернутися до IDEA",
    backPoet: "Повернутися в кабінет",
    numberLocale: "uk-UA",
  },
  ru: {
    poetPackage: "Popular Poet · абонемент",
    poetTrial: "Popular Poet · пробное занятие",
    poetEvent: "Popular Poet · событие",
    ideaTrial: "IDEA · оплата пробного занятия",
    secure: "Безопасная оплата через Przelewy24.",
    pay: "Оплатить через Przelewy24",
    expiredIdea: "Время резервирования места истекло. Вернитесь в IDEA и выберите дату ещё раз.",
    expiredPoet: "Время на оплату истекло. Вернитесь в кабинет и откройте оплату снова.",
    backIdea: "Вернуться в IDEA",
    backPoet: "Вернуться в кабинет",
    numberLocale: "ru-RU",
  },
} as const;

function kickerFor(
  text: (typeof copy)[AppLocale],
  brand: "poet" | "idea",
  kind: "package" | "trial" | "event",
) {
  if (brand === "idea") return text.ideaTrial;
  if (kind === "trial") return text.poetTrial;
  if (kind === "event") return text.poetEvent;
  return text.poetPackage;
}

export default async function CrmCheckoutPage({ params }: { params: Promise<{ locale: AppLocale; orderId: string }> }) {
  const { locale, orderId } = await params;
  const text = copy[locale];
  const supabase = requireServiceSupabase();
  const { data: order } = await supabase
    .from("crm_checkout_orders")
    .select("description,amount_grosze,currency,status,p24_token,metadata")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || !order.p24_token || order.status !== "pending") notFound();
  const { brand, kind } = crmCheckoutPresentation({
    description: order.description,
    metadata: order.metadata,
  });
  const kicker = kickerFor(text, brand, kind);
  const expiresAt = crmReservationExpiresAt(order.metadata);
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    const ideaLocale = locale === "uk" ? "ua" : locale === "pl" ? "ru" : locale;
    const expired = brand === "idea" ? text.expiredIdea : text.expiredPoet;
    const backHref = brand === "idea"
      ? `https://ideaactors.pl/${ideaLocale}`
      : "https://crm.popularpoet.pl/cabinet/payments";
    const back = brand === "idea" ? text.backIdea : text.backPoet;
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5 py-16">
        <section className="w-full rounded-2xl border border-white/15 bg-white/[0.04] p-7 text-center shadow-2xl">
          <p className="mb-3 text-sm uppercase tracking-[0.18em] text-white/55">{kicker}</p>
          <h1 className="font-display text-3xl leading-tight text-white">{expired}</h1>
          <a className="mt-7 inline-flex rounded-full bg-[#e8794e] px-7 py-3 font-semibold text-[#170c0b] transition hover:bg-[#f58a60]" href={backHref}>
            {back}
          </a>
        </section>
      </main>
    );
  }
  const amount = new Intl.NumberFormat(text.numberLocale, { style: "currency", currency: order.currency }).format(order.amount_grosze / 100);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5 py-16">
      <section className="w-full rounded-2xl border border-white/15 bg-white/[0.04] p-7 text-center shadow-2xl">
        <p className="mb-3 text-sm uppercase tracking-[0.18em] text-white/55">{kicker}</p>
        <h1 className="font-display text-3xl leading-tight text-white">{order.description}</h1>
        <p className="mt-5 text-2xl font-semibold text-white">{amount}</p>
        <p className="mt-5 text-sm leading-6 text-white/65">{text.secure}</p>
        <a className="mt-7 inline-flex rounded-full bg-[#e8794e] px-7 py-3 font-semibold text-[#170c0b] transition hover:bg-[#f58a60]" href={crmP24Url(order.p24_token)}>
          {text.pay}
        </a>
      </section>
    </main>
  );
}

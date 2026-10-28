import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EventCheckoutForm } from "@/components/EventCheckoutForm";
import { EventMobileStickyCta } from "@/components/EventMobileStickyCta";
import { RelatedEventsSection } from "@/components/RelatedEventsSection";
import { formatEventDateTime } from "@/lib/format";
import type { PimproTicketPage } from "@/components/PimproTicketPage";
import styles from "./BazarPimproTicketPage.module.css";

export const BAZAR_PIMPRO_SLUG = "pimpro-bazar-club-2026-11-29";

const copy = {
  ru: {
    language: "Импровизация на русском", date: "29 ноября 2026", day: "Воскресенье", city: "Варшава",
    buy: "Купить билет", programme: "План на вечер", impro: "Комедийная импровизация",
    lead: "Актёры создают сцены и диалоги прямо во время выступления. 29 ноября играем в Bazar Club на Праге.",
    place: "Встречаемся в Bazar", address: "ul. Okrzei 26, вход со стороны Jagiellońskiej", directions: "Открыть маршрут",
    checkout: "Ваш билет в Bazar", includes: "Вход по электронному билету.", left: "Осталось билетов", details: "Перед выходом",
    qr: "Где мой билет?", qrAnswer: "После оплаты билет с QR-кодом придёт на указанный email. Покажите его на входе с телефона.",
    arrival: "Куда приходить?", arrivalAnswer: "Bazar Klub, ul. Okrzei 26, Warszawa. Вход со стороны улицы Jagiellońskiej. Начинаем в 19:00.",
    refunds: "Условия возврата", refundsAnswer: "Правила покупки и возврата билетов опубликованы на странице сервиса.", refundsLink: "Прочитать условия",
  },
  uk: {
    language: "Імпровізація російською", date: "29 листопада 2026", day: "Неділя", city: "Варшава",
    buy: "Купити квиток", programme: "План на вечір", impro: "Комедійна імпровізація",
    lead: "Актори створюють сцени й діалоги просто під час виступу. 29 листопада граємо в Bazar Club на Празі.",
    place: "Зустрічаємося в Bazar", address: "ul. Okrzei 26, вхід з боку Jagiellońskiej", directions: "Відкрити маршрут",
    checkout: "Ваш квиток у Bazar", includes: "Вхід за електронним квитком.", left: "Залишилося квитків", details: "Перед виходом",
    qr: "Де мій квиток?", qrAnswer: "Після оплати квиток із QR-кодом надійде на вказаний email. Покажіть його на вході з телефона.",
    arrival: "Куди приходити?", arrivalAnswer: "Bazar Klub, ul. Okrzei 26, Warszawa. Вхід з боку вулиці Jagiellońskiej. Починаємо о 19:00.",
    refunds: "Умови повернення", refundsAnswer: "Правила купівлі та повернення квитків опубліковані на сторінці сервісу.", refundsLink: "Прочитати умови",
  },
  pl: {
    language: "Improwizacja po rosyjsku", date: "29 listopada 2026", day: "Niedziela", city: "Warszawa",
    buy: "Kup bilet", programme: "Plan na wieczór", impro: "Improwizacja komediowa",
    lead: "Aktorzy tworzą sceny i dialogi na żywo podczas występu. 29 listopada gramy w Bazar Club na Pradze.",
    place: "Spotykamy się w Bazarze", address: "ul. Okrzei 26, wejście od Jagiellońskiej", directions: "Otwórz trasę",
    checkout: "Twój bilet do Bazaru", includes: "Wejście z biletem elektronicznym.", left: "Pozostało biletów", details: "Przed wyjściem",
    qr: "Gdzie jest mój bilet?", qrAnswer: "Po opłaceniu zamówienia bilet z kodem QR otrzymasz na podany email. Pokaż go na wejściu na telefonie.",
    arrival: "Gdzie przyjść?", arrivalAnswer: "Bazar Klub, ul. Okrzei 26, Warszawa. Wejście od ulicy Jagiellońskiej. Zaczynamy o 19:00.",
    refunds: "Warunki zwrotu", refundsAnswer: "Zasady zakupu i zwrotu biletów są opublikowane na stronie serwisu.", refundsLink: "Przeczytaj warunki",
  },
};

type Props = Parameters<typeof PimproTicketPage>[0];

export async function BazarPimproTicketPage({ locale, startsAt, priceGrosze, remaining, mapsHref, showCheckout, isPast, eventSlug, bypassPayment, promo, related, ticketsIntentPath, poetHubUrl }: Props) {
  const c = copy[locale];
  const t = await getTranslations({ locale, namespace: "EventPage" });
  const price = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(priceGrosze / 100);

  return <div className={`${styles.page} ${showCheckout ? styles.withSticky : ""}`}>
    <div className={styles.sheet}>
      <nav className={styles.topline} aria-label={t("breadcrumbAria")}>
        <Link href="/events">{t("breadcrumbAfisha")}</Link>
        <span>{c.city} / {c.day}</span>
      </nav>
      <header className={styles.hero}>
        <h1 className={styles.title}>
          <img src="/brand/pimpro/wordmark-on-bone.png" alt="P!MPRO" width={1232} height={332} fetchPriority="high" />
          <span>{c.language}</span>
        </h1>
        <time className={styles.date} dateTime={startsAt} aria-label={formatEventDateTime(startsAt, locale)}>29<span>.</span>11</time>
        <div className={styles.venueRow}>
          <div><p className={styles.club}>BAZAR CLUB</p><p className={styles.address}>{c.address}</p></div>
          <p className={styles.start}>19:00</p>
        </div>
        {showCheckout ? <a href="#event-checkout" className={styles.buyStrip}><span>{c.buy}</span><span>{price} zł</span></a> : <p className={styles.buyStrip}>{isPast ? t("purchaseClosedPast") : t("soldOut")}</p>}
      </header>
      <section className={styles.programme} aria-labelledby="bazar-programme">
        <div className={styles.programmeIntro}><h2 id="bazar-programme">{c.programme}</h2><p>{c.lead}</p></div>
        <ol className={styles.runningOrder}>
          <li><span>19:00<span className={styles.until}>–22:00</span></span><h3>{c.impro}</h3></li>
        </ol>
      </section>
      <section className={styles.location} aria-labelledby="bazar-location">
        <p className={styles.locationNumber} aria-hidden="true">26</p>
        <div><h2 id="bazar-location">{c.place}</h2><p>{c.address}<br />Warszawa, Praga-Północ</p>{mapsHref ? <a href={mapsHref} target="_blank" rel="noopener noreferrer">{c.directions}</a> : null}</div>
      </section>
      <section id="event-checkout" className={styles.checkout} aria-labelledby="bazar-checkout">
        <header className={styles.ticketHeader}>
          <div><p>{c.date} / 19:00</p><h2 id="bazar-checkout">{c.checkout}</h2><p>{c.includes}</p></div>
          <p className={styles.price}>{price}<span>zł</span></p>
        </header>
        <div className={styles.form}>
          {isPast ? <p>{t("purchaseClosedPast")}</p> : showCheckout ? <>
            <p className={styles.remaining}>{c.left}: <strong>{remaining}</strong></p>
            <EventCheckoutForm appearance="pimpro" eventSlug={eventSlug} remaining={remaining} locale={locale} unitPriceGrosze={priceGrosze} bypassPayment={bypassPayment} initialPromoCode={promo?.code} initialPromoDiscountPercent={promo?.discountPercent} initialPromoDiscountFixedGrosze={promo?.discountFixedGrosze} />
          </> : <p>{t("soldOut")}</p>}
        </div>
      </section>
      <section className={styles.faq} aria-labelledby="bazar-faq">
        <h2 id="bazar-faq">{c.details}</h2>
        <details><summary>{c.qr}</summary><p>{c.qrAnswer}</p></details>
        <details><summary>{c.arrival}</summary><p>{c.arrivalAnswer}</p></details>
        <details><summary>{c.refunds}</summary><p>{c.refundsAnswer} <Link href="/zwroty">{c.refundsLink}</Link></p></details>
      </section>
    </div>
    <div className={styles.related}><RelatedEventsSection locale={locale} related={related} ticketsIntentPath={ticketsIntentPath} poetHubUrl={poetHubUrl} /></div>
    {showCheckout ? <EventMobileStickyCta appearance="pimpro" priceGrosze={priceGrosze} remaining={remaining} bypassPayment={bypassPayment} mapsHref={mapsHref ?? undefined} /> : null}
  </div>;
}

import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EventCheckoutForm } from "@/components/EventCheckoutForm";
import { EventMobileStickyCta } from "@/components/EventMobileStickyCta";
import { RelatedEventsSection } from "@/components/RelatedEventsSection";
import { isOptimizableEventImage } from "@/lib/imageOptimization";
import type { PimproTicketPage } from "@/components/PimproTicketPage";
import styles from "./BazarPimproTicketPage.module.css";

export const BAZAR_PIMPRO_SLUG = "pimpro-bazar-club-2026-11-29";

const copy = {
  ru: {
    genre: "Шоу импровизации", date: "29 ноября 2026", day: "Воскресенье", city: "Варшава", languageNote: null,
    buy: "Купить билет", lead: "Проведите воскресный вечер с P!MPRO в Bazar Club. Актёры придумывают комедийные сцены и диалоги прямо во время шоу.",
    address: "ul. Okrzei 26, вход со стороны Jagiellońskiej", directions: "Как добраться",
    checkout: "Билеты на P!MPRO", available: "Билетов в продаже", refunds: "Условия покупки и возврата",
    poster: "Афиша P!MPRO в Bazar Club: участники и зрители смотрят на логотип на сцене",
  },
  uk: {
    genre: "Шоу імпровізації", date: "29 листопада 2026", day: "Неділя", city: "Варшава", languageNote: "Мова виступу: російська",
    buy: "Купити квиток", lead: "Проведіть недільний вечір із P!MPRO у Bazar Club. Актори вигадують комедійні сцени й діалоги просто під час шоу.",
    address: "ul. Okrzei 26, вхід з боку Jagiellońskiej", directions: "Як дістатися",
    checkout: "Квитки на P!MPRO", available: "Квитків у продажу", refunds: "Умови купівлі та повернення",
    poster: "Афіша P!MPRO в Bazar Club: учасники та глядачі дивляться на логотип на сцені",
  },
  pl: {
    genre: "Improwizacja komediowa", date: "29 listopada 2026", day: "Niedziela", city: "Warszawa", languageNote: "Język wydarzenia: rosyjski",
    buy: "Kup bilet", lead: "Spędź niedzielny wieczór z P!MPRO w Bazar Club. Aktorzy tworzą komediowe sceny i dialogi na żywo.",
    address: "ul. Okrzei 26, wejście od Jagiellońskiej", directions: "Jak dojechać",
    checkout: "Bilety na P!MPRO", available: "Bilety w sprzedaży", refunds: "Warunki zakupu i zwrotu",
    poster: "Plakat P!MPRO w Bazar Club: uczestnicy i widzowie patrzą na logo na scenie",
  },
};

type Props = Parameters<typeof PimproTicketPage>[0];

export async function BazarPimproTicketPage({ locale, imageUrl, startsAt, priceGrosze, remaining, mapsHref, showCheckout, isPast, eventSlug, bypassPayment, promo, related, ticketsIntentPath, poetHubUrl }: Props) {
  const c = copy[locale];
  const t = await getTranslations({ locale, namespace: "EventPage" });
  const price = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(priceGrosze / 100);

  return <div className={`${styles.page} ${showCheckout ? styles.withSticky : ""}`}>
    <div className={styles.sheet}>
      <nav className={styles.topline} aria-label={t("breadcrumbAria")}>
        <Link href="/events">{t("breadcrumbAfisha")}</Link><span>{c.city}</span>
      </nav>
      <header className={styles.hero}>
        {imageUrl ? <div className={styles.poster}><Image src={imageUrl} alt={c.poster} width={1088} height={1448} priority quality={85} sizes="(min-width:1120px) 560px, (min-width:768px) 54vw, 100vw" unoptimized={!isOptimizableEventImage(imageUrl)} /></div> : null}
        <div className={styles.intro}>
          <h1 className={styles.title}>P!MPRO<span>{c.genre}</span></h1>
          <p className={styles.lead}>{c.lead}</p>
          <div className={styles.facts}>
            <div><time dateTime={startsAt}>{c.date}</time><p>{c.day} · 19:00–22:00</p></div>
            <div><p className={styles.club}>Bazar Club</p><p>{c.address}</p>{mapsHref ? <a href={mapsHref} target="_blank" rel="noopener noreferrer">{c.directions}</a> : null}</div>
            {c.languageNote ? <p className={styles.languageNote}>{c.languageNote}</p> : null}
          </div>
          {showCheckout ? <>
            <a href="#event-checkout" className={styles.buyStrip}><span>{c.buy}</span><span>{price} zł</span></a>
            <p className={styles.availability}>{c.available}: {remaining}</p>
          </> : <p className={styles.closed}>{isPast ? t("purchaseClosedPast") : t("soldOut")}</p>}
        </div>
      </header>
      <section id="event-checkout" className={styles.checkout} aria-labelledby="bazar-checkout">
        <header className={styles.ticketHeader}><h2 id="bazar-checkout">{c.checkout}</h2><p>{c.date} · 19:00–22:00</p></header>
        <div className={styles.form}>
          {isPast ? <p>{t("purchaseClosedPast")}</p> : showCheckout ? <EventCheckoutForm appearance="pimpro" eventSlug={eventSlug} remaining={remaining} locale={locale} unitPriceGrosze={priceGrosze} bypassPayment={bypassPayment} initialPromoCode={promo?.code} initialPromoDiscountPercent={promo?.discountPercent} initialPromoDiscountFixedGrosze={promo?.discountFixedGrosze} /> : <p>{t("soldOut")}</p>}
          <Link className={styles.refunds} href="/zwroty">{c.refunds}</Link>
        </div>
      </section>
    </div>
    <div className={styles.related}><RelatedEventsSection locale={locale} related={related} ticketsIntentPath={ticketsIntentPath} poetHubUrl={poetHubUrl} /></div>
    {showCheckout ? <EventMobileStickyCta appearance="pimpro" priceGrosze={priceGrosze} remaining={remaining} bypassPayment={bypassPayment} mapsHref={mapsHref ?? undefined} /> : null}
  </div>;
}

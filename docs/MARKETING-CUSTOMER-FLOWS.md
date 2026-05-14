# Маркетинг і два потоки клієнтів (Popular Poet + PopularTickets)

## Дві цільові аудиторії (ЦА)

### 1) Учасники курсів і пробних занять

- **Дискавері:** `popularpoet.pl` (локалі `pl` / `uk` / `ru`) — блок курсів, пояснення пробного, контакт у Telegram / Direct, посилання на `firma` на квитковому сайті.
- **Пробний з оплатою:** подія з типом **`trial`** у БД (`events.listing_kind = trial`) публікується на Poet; кнопка веде на **ту саму подію** на PopularTickets (`/{locale}/events/{slug}`) — форма, Przelewy24, лист із PDF.
- **Запис без каси:** Telegram **@Stefan_stepp** (як на `/firma`).
- **Подарунок:** у полі email на чекауті PopularTickets вказати email отримувача.

### 2) Глядачі виступів / шоу / спектаклів

- **Дискавері:** головна **PopularTickets** — лише події з **`listing_kind = performance`** (за замовчуванням) і галочкою «Опубликовать».
- **Покупка:** картка події → сторінка події → оплата → email.

## Що створюється в адмінці PopularTickets

| Сутність | Де видно | Оплата / квиток |
|----------|------------|-----------------|
| **Виступ** (`listing_kind = performance`) | Афіша PopularTickets | Так, на PopularTickets |
| **Пробний** (`listing_kind = trial`) | Блок пробних на popularpoet.pl | Так, редірект на сторінку тієї ж події на PopularTickets |
| **Курс** (таблиця `poet_course`, розділ «Курси Poet» в адмінці) | Картки на головній popularpoet.pl | Окремо: можна продавати через подію-пробний або іншу подію |

## SQL (обов’язково для фільтра афіші)

Виконайте в Supabase після оновлення коду:

1. `supabase/add-events-listing-kind.sql` — колонка `listing_kind`, індекс, **RLS SELECT** опублікованих `events` для anon (щоб Poet читав пробні без service role).
2. `supabase/courses-poet.sql` — якщо ще не робили: таблиці `poet_course` / `poet_trial_slot` (legacy-слоти з прив’язкою до курсу).

## SEO (Poet)

- У `messages/*/metadata`: `description`, `keywords`, `ogImagePath`, `ogImageAlt`.
- Канонікал і hreflang будуються з **`NEXT_PUBLIC_POET_SITE_URL`** (production на Vercel для проєкту poet).

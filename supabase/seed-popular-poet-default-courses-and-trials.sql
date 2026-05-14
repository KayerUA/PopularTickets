-- Одноразовый сид Popular Poet: 4 курса (по направлению) + 4 пробных события (по одному на курс).
-- Дальше контент только вручную через админку — этот файл просто «разворачивает» стартовый набор один раз.
--
-- Условия: уже выполнены schema.sql, courses-poet.sql, add-events-listing-kind.sql,
--         add-content-visibility.sql (колонка visibility вместо is_published),
--         и миграция с колонкой events.poet_course_id (add-events-poet-course-id-column.sql
--         или add-poet-course-masterclass-and-event-fk.sql).
--
-- Выполните в Supabase → SQL Editor. Повторный запуск безопасен (ON CONFLICT по slug).
--
-- Обложки событий: пути /courses/*.jpg — статика в apps/tickets/public/courses/ (PopularTickets),
-- чтобы страница /{locale}/events/{slug} открывала картинку на том же домене.

-- ─── Курсы (slug совпадают с popularpoet.pl /kursy/{slug}) ─────────────────
insert into public.poet_course (slug, title, kind, body, visibility, sort_order)
values
  (
    'improv',
    'Актёрская импровизация',
    'improvisation',
    'Сцена «здесь и сейчас», форматы и зритель — без заученного текста. Пробное: оплата на PopularTickets.',
    'published',
    10
  ),
  (
    'acting',
    'Актёрское мастерство',
    'acting',
    'Голос, текст и присутствие на сцене. Пробное: оплата на PopularTickets.',
    'published',
    20
  ),
  (
    'masterclass',
    'Мастер-классы',
    'masterclass',
    'Сжатый интенсив по теме. Пробное: оплата на PopularTickets.',
    'published',
    30
  ),
  (
    'playback',
    'Группы PLAY-BACK',
    'playback',
    'Музыка, движение и истории зрителей на сцене. Пробное: оплата на PopularTickets.',
    'published',
    40
  )
on conflict (slug) do update set
  title = excluded.title,
  kind = excluded.kind,
  body = excluded.body,
  visibility = excluded.visibility,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ─── Пробные (listing_kind = trial, привязка к курсу) ──────────────────────
-- Slug события — стабильный, не пересекается с seed-improv-event.sql.
insert into public.events (
  slug,
  title,
  description,
  image_url,
  maps_url,
  venue,
  starts_at,
  price_grosze,
  total_tickets,
  visibility,
  listing_kind,
  poet_course_id
)
values
  (
    'pp-trial-improv',
    'Пробное: актёрская импровизация',
    $d1$
Пробный слот Popular Poet в Варшаве. Вы оформляете билет на PopularTickets: оплата Przelewy24, подтверждение на email.

Адрес (польский): Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.
    $d1$,
    '/courses/impro.jpg',
    'https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic',
    'Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42',
    (now() at time zone 'utc') + interval '10 days',
    5000,
    24,
    'published',
    'trial',
    (select id from public.poet_course where slug = 'improv' limit 1)
  ),
  (
    'pp-trial-acting',
    'Пробное: актёрское мастерство',
    $d2$
Пробный слот Popular Poet в Варшаве. Оплата и билет — на PopularTickets (Przelewy24).

Адрес: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.
    $d2$,
    '/courses/akterka.jpg',
    'https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic',
    'Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42',
    (now() at time zone 'utc') + interval '11 days',
    5000,
    24,
    'published',
    'trial',
    (select id from public.poet_course where slug = 'acting' limit 1)
  ),
  (
    'pp-trial-masterclass',
    'Пробное: мастер-класс',
    $d3$
Пробный слот Popular Poet в Варшаве. Оплата и билет — на PopularTickets.

Адрес: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.
    $d3$,
    '/courses/theatre.jpg',
    'https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic',
    'Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42',
    (now() at time zone 'utc') + interval '12 days',
    5000,
    24,
    'published',
    'trial',
    (select id from public.poet_course where slug = 'masterclass' limit 1)
  ),
  (
    'pp-trial-playback',
    'Пробное: PLAY-BACK',
    $d4$
Пробный слот Popular Poet в Варшаве. Оплата и билет — на PopularTickets.

Адрес: Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42.
    $d4$,
    '/courses/play-back.jpg',
    'https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic',
    'Warszawa, ul. Domaniewska 37, Centrum biznesowe Zepter, piętro 5, lokal 42',
    (now() at time zone 'utc') + interval '13 days',
    5000,
    24,
    'published',
    'trial',
    (select id from public.poet_course where slug = 'playback' limit 1)
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  image_url = excluded.image_url,
  maps_url = excluded.maps_url,
  venue = excluded.venue,
  starts_at = excluded.starts_at,
  price_grosze = excluded.price_grosze,
  total_tickets = excluded.total_tickets,
  visibility = excluded.visibility,
  listing_kind = excluded.listing_kind,
  poet_course_id = excluded.poet_course_id,
  updated_at = now();

-- Одноразовый сид: шоу «Импровизация», Świetlica Wolności, 2026-05-08 21:00 Europe/Warsaw.
-- Выполните в Supabase → SQL Editor после schema.sql.
-- Картинка: файл в репо public/events/improv-swietlica-2026-05-08.png → на проде URL вида https://<домен>/events/...

insert into public.events (
  slug,
  title,
  description,
  image_url,
  venue,
  starts_at,
  price_grosze,
  total_tickets,
  is_published
)
values (
  'improv-swietlica-2026-05-08',
  'Как провести вечер пятницы? Шоу «Импровизация»',
  $desc$
Как провести вечер пятницы? Сходить на шоу «Импровизация».

8 мая (пт), 21:00 — бар Świetlica Wolności, Nowy Świat 6/12, 00-400 Warszawa.

Карта: https://maps.app.goo.gl/jz9E6JUn8rcymRoH7?g_st=ic

Наши актёры будут создавать сюжеты на ваших глазах, шутить без заготовок, справляться со сложными актёрскими задачами.

Начало в 21:00
• Юмор и комедии
• Много интерактива
• Форматы со зрителями
• Сложные задачи для актёров

Проведём вечер пятницы в кругу друзей, потягивая напитки с бара и наслаждаясь комедией в жанре импровизации.

Зовите друзей, приходите заранее.

Билет — 100 zł.
  $desc$,
  '/events/improv-swietlica-2026-05-08.png',
  'Świetlica Wolności — Nowy Świat 6/12, 00-400 Warszawa',
  timestamptz '2026-05-08T21:00:00+02',
  10000,
  120,
  true
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  image_url = excluded.image_url,
  venue = excluded.venue,
  starts_at = excluded.starts_at,
  price_grosze = excluded.price_grosze,
  total_tickets = excluded.total_tickets,
  is_published = excluded.is_published,
  updated_at = now();

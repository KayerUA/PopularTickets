-- Исправить событие 28.05.2026: «мастер-класс» → пробное занятие по импровизации.
-- Выполните в Supabase SQL Editor. Сначала смотрите SELECT, потом UPDATE.

-- 1) Найти ошибочное событие
select id, slug, title, listing_kind, starts_at, visibility
from public.events
where slug like 'master-klass-po-komediynoy-improvizatsii%'
   or (
     starts_at >= '2026-05-28 17:00:00+00'
     and starts_at < '2026-05-28 21:00:00+00'
     and title ilike '%мастер%класс%'
   );

-- 2) Переименовать + trial + новый slug (второе probnoe-improv — суффикс -2)
-- Старый URL перестанет работать; новый будет с -2
update public.events
set
  slug = 'probnoe-zanyatie-po-improvizatsii-v-varshave-teatr-populyarnyy-poet-2',
  title = 'Пробное занятие по импровизации в Варшаве — театр «Популярный поэт»',
  title_pl = 'Zajęcia próbne z improwizacji w Warszawie — Teatr „Popularny Poeta”',
  title_uk = 'Пробне заняття з імпровізації у Варшаві — театр «Популярний поет»',
  listing_kind = 'trial',
  updated_at = now()
where slug like 'master-klass-po-komediynoy-improvizatsii%';

-- 3) Проверка трёх пробных из той афиши
select slug, title, listing_kind, starts_at at time zone 'Europe/Warsaw' as warsaw_local
from public.events
where starts_at::date between '2026-05-27' and '2026-05-29'
  and listing_kind = 'trial'
order by starts_at;

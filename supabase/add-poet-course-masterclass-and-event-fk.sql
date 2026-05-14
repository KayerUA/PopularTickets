-- Розширення курсів + прив'язка пробного слоту (подія trial) до курсу на popularpoet.pl.
-- Виконайте в SQL Editor після schema.sql / courses-poet.sql та add-events-listing-kind.sql.

-- 1) Новий вид курсу: майстер-класи
alter table public.poet_course drop constraint if exists poet_course_kind_check;
alter table public.poet_course
  add constraint poet_course_kind_check
  check (kind in ('improvisation', 'acting', 'playback', 'masterclass', 'other'));

-- 2) Подія trial може посилатися на курс (для календаря та сторінки /kursy/{slug})
alter table public.events add column if not exists poet_course_id uuid references public.poet_course (id) on delete set null;

create index if not exists events_poet_course_id_idx on public.events (poet_course_id) where poet_course_id is not null;

comment on column public.events.poet_course_id is
  'If listing_kind = trial: FK to poet_course for course page trials filter and calendar.';

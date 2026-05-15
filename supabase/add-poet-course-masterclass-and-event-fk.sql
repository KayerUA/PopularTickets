-- Прив'язка пробного слоту (подія trial) до курсу на popularpoet.pl.
-- Розширення enum `kind` для poet_course прибрано — замість нього див. add-poet-course-media-drop-kind.sql.
-- Виконайте в SQL Editor після schema.sql / courses-poet.sql та add-events-listing-kind.sql.

alter table public.events add column if not exists poet_course_id uuid references public.poet_course (id) on delete set null;

create index if not exists events_poet_course_id_idx on public.events (poet_course_id) where poet_course_id is not null;

comment on column public.events.poet_course_id is
  'If listing_kind = trial: FK to poet_course for course page trials filter and calendar.';

-- При ошибке schema cache: Dashboard → Settings → API → Reload schema.

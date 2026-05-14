-- Только колонка привязки пробного к курсу (если полный файл add-poet-course-masterclass-and-event-fk.sql ещё не запускали).
-- Выполните в Supabase → SQL Editor.

alter table public.events add column if not exists poet_course_id uuid references public.poet_course (id) on delete set null;

create index if not exists events_poet_course_id_idx on public.events (poet_course_id) where poet_course_id is not null;

comment on column public.events.poet_course_id is
  'If listing_kind = trial: FK to poet_course for course page trials filter and calendar.';

-- Если PostgREST ругается на schema cache: Supabase Dashboard → Settings → API → Reload schema (NOTIFY в SQL на hosted часто недоступен / не нужен).

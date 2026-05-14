-- Только колонка привязки пробного к курсу (если полный файл add-poet-course-masterclass-and-event-fk.sql ещё не запускали).
-- Выполните в Supabase → SQL Editor.

alter table public.events add column if not exists poet_course_id uuid references public.poet_course (id) on delete set null;

create index if not exists events_poet_course_id_idx on public.events (poet_course_id) where poet_course_id is not null;

comment on column public.events.poet_course_id is
  'If listing_kind = trial: FK to poet_course for course page trials filter and calendar.';

-- После ALTER кэш PostgREST может быть старым — обновите схему (иначе ошибка "Could not find poet_course_id in the schema cache"):
notify pgrst, 'reload schema';

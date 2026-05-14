/*
  Три состояния видимости вместо булева is_published:
    published  — в списках на сайте (афиша, курсы на Poet)
    unlisted   — не в списках, но страница по прямой ссылке и оплата (PopularTickets checkout)
    inactive   — скрыто: 404 на странице события / курса на Poet; оплата недоступна

  После выполнения в Supabase: Settings → API → Reload schema cache.
  Anon RLS: строки visibility in (published, unlisted); списки в приложении фильтруют только published.

  Важно: сначала снимаем RLS/индексы, зависящие от is_published, затем удаляем колонку.
*/

-- events: колонка и данные
alter table public.events add column if not exists visibility text;

update public.events
set visibility = coalesce(
  visibility,
  case when coalesce(is_published, false) then 'published' else 'inactive' end
);

update public.events set visibility = 'inactive' where visibility is null;

alter table public.events alter column visibility set default 'inactive';
alter table public.events alter column visibility set not null;

alter table public.events drop constraint if exists events_visibility_check;
alter table public.events
  add constraint events_visibility_check check (visibility in ('published', 'unlisted', 'inactive'));

comment on column public.events.visibility is
  'published = в афіші; unlisted = лише за прямим посиланням; inactive = приховано з сайту.';

-- events: индексы и политика, которые ссылаются на is_published, — до drop column
drop index if exists events_listing_published_starts_idx;
drop index if exists events_published_idx;

drop policy if exists "events_select_published" on public.events;
create policy "events_select_published"
  on public.events for select to anon, authenticated
  using (visibility in ('published', 'unlisted'));

alter table public.events drop column if exists is_published;

create index if not exists events_listing_visibility_starts_idx
  on public.events (listing_kind, visibility, starts_at);
create index if not exists events_visibility_idx on public.events (visibility);

-- poet_course: колонка и данные
alter table public.poet_course add column if not exists visibility text;

update public.poet_course
set visibility = coalesce(
  visibility,
  case when coalesce(is_published, false) then 'published' else 'inactive' end
);

update public.poet_course set visibility = 'inactive' where visibility is null;

alter table public.poet_course alter column visibility set default 'inactive';
alter table public.poet_course alter column visibility set not null;

alter table public.poet_course drop constraint if exists poet_course_visibility_check;
alter table public.poet_course
  add constraint poet_course_visibility_check check (visibility in ('published', 'unlisted', 'inactive'));

comment on column public.poet_course.visibility is
  'published = на главной Poet; unlisted = только страница /kursy/{slug}; inactive = скрыт.';

-- poet_course: индекс и политика до drop column
drop index if exists poet_course_published_idx;

drop policy if exists "poet_course_select_published" on public.poet_course;
create policy "poet_course_select_published"
  on public.poet_course for select to anon, authenticated
  using (visibility in ('published', 'unlisted'));

alter table public.poet_course drop column if exists is_published;

create index if not exists poet_course_visibility_sort_idx on public.poet_course (visibility, sort_order);

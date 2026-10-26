begin;

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  format text not null check (format in ('improv', 'theatre', 'playback')),
  updated_at timestamptz not null default now()
);
alter table public.shows enable row level security;
drop policy if exists shows_public_read on public.shows;
create policy shows_public_read on public.shows for select using (true);
grant select on public.shows to anon, authenticated;
grant all on public.shows to service_role;

alter table public.events add column if not exists ends_at timestamptz;
alter table public.events add column if not exists show_id uuid references public.shows(id) on delete set null;
create index if not exists events_show_id_starts_idx on public.events(show_id, starts_at);
alter table public.events drop constraint if exists events_end_after_start;
alter table public.events add constraint events_end_after_start check (ends_at is null or ends_at > starts_at);

insert into public.shows(slug, title, format) values
  ('pimpro', 'P!MPRO', 'improv'),
  ('boing-boing', 'Боинг-Боинг', 'theatre'),
  ('truffaldino-iz-bergamo', 'Труффальдино из Бергамо', 'theatre'),
  ('popular-improv', 'Popular Improv', 'improv'),
  ('populyarnye-improvizatory', 'Популярные импровизаторы', 'improv'),
  ('impro-dva-palcha', 'Импро Два пальца', 'improv'),
  ('noga-v-nogu', 'Нога в ногу', 'improv'),
  ('play-back', 'PLAY-BACK', 'playback')
on conflict (slug) do nothing;

update public.events e set show_id = s.id
from public.shows s, (values
  ('0851436c-91b5-4c3a-a609-534d03fd539e'::uuid, 'impro-dva-palcha'),
  ('abd9c719-a483-4fca-a883-50503d92dd62'::uuid, 'play-back'),
  ('358b0667-1248-4d98-875e-04a6bc9079c2'::uuid, 'populyarnye-improvizatory'),
  ('da7b5dad-0d0a-4140-9bf1-b26ac77ea693'::uuid, 'boing-boing'),
  ('a8aca528-fd30-46b9-902b-e4a892b77389'::uuid, 'popular-improv'),
  ('4ef6fc3c-def0-409f-956d-0eb50c19358e'::uuid, 'truffaldino-iz-bergamo'),
  ('85bb1aa4-30c7-4b53-99c1-8dd638675aeb'::uuid, 'popular-improv'),
  ('26ebbcf6-221e-4663-a764-9fea2651b88e'::uuid, 'boing-boing'),
  ('993eb835-3ec4-4795-a113-4278d52921a9'::uuid, 'boing-boing'),
  ('b81e7445-1f85-4986-a651-5643e30ee71f'::uuid, 'noga-v-nogu'),
  ('2f7e1b5b-4ca4-4f61-9bf0-348b217e958c'::uuid, 'pimpro')
) mapping(event_id, show_slug)
where e.id = mapping.event_id and s.slug = mapping.show_slug and e.show_id is null;

update public.events set ends_at = starts_at + interval '2 hours'
where listing_kind = 'trial' and ends_at is null;
update public.events set ends_at = starts_at + interval '3 hours 30 minutes'
where slug = 'pimpro-shou-vecherinka-2026-11-15' and ends_at is null;

create table if not exists public.event_redirects (
  event_slug text primary key,
  show_id uuid not null references public.shows(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.event_redirects enable row level security;
drop policy if exists event_redirects_public_read on public.event_redirects;
create policy event_redirects_public_read on public.event_redirects for select using (true);
grant select on public.event_redirects to anon, authenticated;
grant all on public.event_redirects to service_role;

create or replace function public.keep_deleted_event_show() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.show_id is not null then
    insert into public.event_redirects(event_slug, show_id) values(old.slug, old.show_id)
    on conflict (event_slug) do update set show_id = excluded.show_id;
  end if;
  return old;
end;
$$;
drop trigger if exists keep_deleted_event_show on public.events;
create trigger keep_deleted_event_show before delete on public.events
for each row execute function public.keep_deleted_event_show();

notify pgrst, 'reload schema';
commit;

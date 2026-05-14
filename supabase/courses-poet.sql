-- Kursy / próby (Popular Poet) — jedna baza z PopularTickets.
-- Uruchom w SQL Editor Supabase PO wykonaniu głównego schema.sql (tabele events itd. muszą istnieć).
--
-- Kontrakt deep link: poet_trial_slot.tickets_checkout_event_slug = events.slug
-- → link na stronie poet: {NEXT_PUBLIC_TICKETS_SITE_URL}/pl/events/{slug} (lub /uk, /ru).

create table if not exists public.poet_course (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  kind text not null
    check (kind in ('improvisation', 'acting', 'playback', 'other')),
  body text,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists poet_course_published_idx on public.poet_course (is_published, sort_order);

create table if not exists public.poet_trial_slot (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.poet_course (id) on delete set null,
  title text not null,
  body text,
  starts_at timestamptz,
  tickets_checkout_event_slug text not null references public.events (slug) on delete restrict,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists poet_trial_published_idx on public.poet_trial_slot (is_published, starts_at);

drop trigger if exists poet_course_set_updated_at on public.poet_course;
create trigger poet_course_set_updated_at
before update on public.poet_course
for each row execute function public.set_updated_at();

drop trigger if exists poet_trial_slot_set_updated_at on public.poet_trial_slot;
create trigger poet_trial_slot_set_updated_at
before update on public.poet_trial_slot
for each row execute function public.set_updated_at();

comment on table public.poet_course is 'Kursy Popular Poet (treść na popularpoet.pl).';
comment on table public.poet_trial_slot is 'Terminy zajęć próbnych; płatność przez istniejące wydarzenie events.slug → PopularTickets checkout.';
comment on column public.poet_trial_slot.tickets_checkout_event_slug is 'Musi wskazywać na opublikowane wydarzenie-bilet (trial) w public.events.';

alter table public.poet_course enable row level security;
alter table public.poet_trial_slot enable row level security;

drop policy if exists "poet_course_select_published" on public.poet_course;
create policy "poet_course_select_published"
  on public.poet_course for select to anon, authenticated
  using (is_published = true);

drop policy if exists "poet_trial_slot_select_published" on public.poet_trial_slot;
create policy "poet_trial_slot_select_published"
  on public.poet_trial_slot for select to anon, authenticated
  using (is_published = true);

grant select on public.poet_course to anon, authenticated;
grant select on public.poet_trial_slot to anon, authenticated;

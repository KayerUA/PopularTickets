-- PopularTickets MVP — Supabase / PostgreSQL
-- Выполните в SQL Editor проекта Supabase.
--
-- Про «destructive / Query has destructive operations» в UI Supabase:
-- скрипт содержит только DROP TRIGGER IF EXISTS … — это безопасно: триггеры
-- пересоздаются, данные в таблицах не удаляются. Подтверждение выполнения — ок.
--
-- Этот файл НЕ вставляет события: после успешного запуска таблицы пустые.
-- Событие: supabase/seed-improv-event.sql или админка / npm run seed:improv.

create extension if not exists "pgcrypto";

-- События
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  image_url text,
  maps_url text,
  venue text not null,
  starts_at timestamptz not null,
  price_grosze int not null check (price_grosze > 0),
  total_tickets int not null check (total_tickets > 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_published_idx on public.events (is_published);

alter table public.events add column if not exists maps_url text;

alter table public.events
  add column if not exists listing_kind text not null default 'performance'
  check (listing_kind in ('performance', 'trial'));

comment on column public.events.listing_kind is
  'performance = афіша виступів на PopularTickets; trial = пробний слот на popularpoet.pl (оплата на тій же події).';

create index if not exists events_listing_published_starts_idx
  on public.events (listing_kind, is_published, starts_at);

-- Заказы
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete restrict,
  buyer_name text not null,
  email text not null,
  phone text,
  quantity int not null check (quantity > 0 and quantity <= 50),
  amount_grosze int not null check (amount_grosze > 0),
  currency text not null default 'PLN',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  locale text not null default 'pl' check (locale in ('pl', 'uk', 'ru')),
  p24_session_id text not null unique,
  p24_order_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_event_id_idx on public.orders (event_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_email_idx on public.orders (email);

-- Миграция: `locale` у заказов (старые БД без колонки — `create table if not exists` её не добавляет).
-- Ошибка PostgREST PGRST204 «Could not find the 'locale' column…» — выполните этот блок или `supabase/add-order-locale.sql`.
alter table public.orders
  add column if not exists locale text not null default 'pl'
  check (locale in ('pl', 'uk', 'ru'));

comment on column public.orders.locale is 'Язык интерфейса при оформлении (pl|uk|ru) — письмо с билетами.';

-- Миграция: согласие на маркетинговые email — `supabase/add-order-marketing-email-opt-in.sql`.
alter table public.orders
  add column if not exists marketing_email_opt_in boolean not null default false;

comment on column public.orders.marketing_email_opt_in is
  'Согласие покупателя на информационные/маркетинговые email (отдельно от транзакционных писем о заказе).';

-- Билеты (UUID = ticket_id для QR)
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete restrict,
  ticket_number text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tickets_order_id_idx on public.tickets (order_id);
create index if not exists tickets_event_id_idx on public.tickets (event_id);

-- История чек-инов (аудит)
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  created_at timestamptz not null default now(),
  source_ip text
);

create index if not exists checkins_ticket_id_idx on public.checkins (ticket_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- maps_url: RPC для PostgREST (избегает «column … not in the schema cache» при REST select/update).
create or replace function public.pt_event_maps_url(p_event_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select maps_url from public.events where id = p_event_id limit 1;
$$;

create or replace function public.pt_event_set_maps_url(p_event_id uuid, p_maps_url text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.events
  set maps_url = nullif(trim(p_maps_url), '')
  where id = p_event_id;
$$;

revoke all on function public.pt_event_maps_url(uuid) from public;
grant execute on function public.pt_event_maps_url(uuid) to service_role;

revoke all on function public.pt_event_set_maps_url(uuid, text) from public;
grant execute on function public.pt_event_set_maps_url(uuid, text) to service_role;

-- RLS: заказы/билеты — только service role. События: публичный SELECT опубликованных (для popularpoet.pl + SSR).
alter table public.events enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "events_select_published" on public.events;
create policy "events_select_published"
  on public.events for select to anon, authenticated
  using (is_published = true);

grant select on public.events to anon, authenticated;

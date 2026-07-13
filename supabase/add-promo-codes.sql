-- Партнёрские промокоды: выполните в Supabase SQL Editor после основной schema.sql.

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  partner_name text not null,
  discount_percent integer not null check (discount_percent > 0 and discount_percent < 100),
  scope text not null default 'all' check (scope in ('all', 'special', 'event')),
  event_id uuid references public.events(id) on delete set null,
  landing_event_id uuid references public.events(id) on delete set null,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope = 'event' and event_id is not null) or (scope <> 'event')),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create unique index if not exists promo_codes_code_lower_uidx on public.promo_codes (lower(code));
create index if not exists promo_codes_scope_active_idx on public.promo_codes (scope, is_active);

create table if not exists public.promo_code_visits (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  visited_at timestamptz not null default now()
);

create index if not exists promo_code_visits_code_visited_idx on public.promo_code_visits (promo_code_id, visited_at desc);

alter table public.orders
  add column if not exists promo_code_id uuid references public.promo_codes(id) on delete set null,
  add column if not exists promo_code text,
  add column if not exists promo_discount_grosze integer not null default 0 check (promo_discount_grosze >= 0);

create index if not exists orders_promo_code_id_idx on public.orders (promo_code_id) where promo_code_id is not null;

comment on table public.promo_codes is 'Промокоды партнёров. scope: all = все события; special = только special; event = конкретное событие.';

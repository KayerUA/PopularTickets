-- Подарочные сертификаты Popular Poet (оплата через P24 на PopularTickets).
-- Выполните в Supabase SQL Editor.

create table if not exists public.gift_orders (
  id uuid primary key default gen_random_uuid(),
  product_code text not null check (product_code in ('trial_gift', 'pass_4')),
  buyer_name text not null,
  email text not null,
  phone text,
  recipient_name text,
  gift_message text,
  amount_grosze int not null check (amount_grosze > 0),
  currency text not null default 'PLN',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  locale text not null default 'ru' check (locale in ('pl', 'uk', 'ru')),
  p24_session_id text not null unique,
  p24_order_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gift_orders_status_idx on public.gift_orders (status);
create index if not exists gift_orders_email_idx on public.gift_orders (email);

comment on table public.gift_orders is
  'Заказы подарочных сертификатов (пробное занятие / абонемент 4 занятия).';

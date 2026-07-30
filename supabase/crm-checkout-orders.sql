-- PopularCRM -> PopularTickets checkout bridge. Run this migration in Supabase SQL Editor.
-- These rows are private integration data: only the server-side service role may access them.

create table if not exists public.crm_checkout_orders (
  id uuid primary key default gen_random_uuid(),
  crm_payment_id text not null unique,
  amount_grosze integer not null check (amount_grosze > 0),
  currency text not null default 'PLN' check (currency = 'PLN'),
  description text not null,
  buyer_email text not null,
  buyer_name text,
  payer_name text,
  invoice_number text,
  return_url text not null,
  webhook_url text not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  p24_session_id text not null unique,
  p24_order_id bigint unique,
  p24_token text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists crm_checkout_orders_status_idx on public.crm_checkout_orders (status);
create index if not exists crm_checkout_orders_session_idx on public.crm_checkout_orders (p24_session_id);

create table if not exists public.crm_checkout_webhook_attempts (
  id uuid primary key default gen_random_uuid(),
  crm_checkout_order_id uuid not null references public.crm_checkout_orders(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  status_code integer,
  error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists crm_checkout_webhook_attempts_order_idx
  on public.crm_checkout_webhook_attempts (crm_checkout_order_id, created_at desc);

drop trigger if exists crm_checkout_orders_set_updated_at on public.crm_checkout_orders;
create trigger crm_checkout_orders_set_updated_at
before update on public.crm_checkout_orders
for each row execute function public.set_updated_at();

alter table public.crm_checkout_orders enable row level security;
alter table public.crm_checkout_webhook_attempts enable row level security;

revoke all on table public.crm_checkout_orders from anon, authenticated;
revoke all on table public.crm_checkout_webhook_attempts from anon, authenticated;
grant all on table public.crm_checkout_orders to service_role;
grant all on table public.crm_checkout_webhook_attempts to service_role;

comment on table public.crm_checkout_orders is
  'Private CRM package payment orders paid through PopularTickets / Przelewy24.';

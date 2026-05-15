-- Payment callback audit trail.

create table if not exists public.payment_callbacks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  order_id uuid references public.orders (id) on delete set null,
  provider_order_id text,
  session_id text,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_callbacks_order_id_idx on public.payment_callbacks (order_id);
create index if not exists payment_callbacks_session_id_idx on public.payment_callbacks (session_id);

alter table public.payment_callbacks enable row level security;

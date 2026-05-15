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
  visibility text not null default 'inactive' check (visibility in ('published', 'unlisted', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_visibility_idx on public.events (visibility);

alter table public.events add column if not exists maps_url text;

alter table public.events
  add column if not exists listing_kind text not null default 'performance'
  check (listing_kind in ('performance', 'trial'));

comment on column public.events.listing_kind is
  'performance = афіша виступів на PopularTickets; trial = пробний слот на popularpoet.pl (оплата на тій же події).';

alter table public.events
  add column if not exists image_focal_x double precision not null default 50;
alter table public.events
  add column if not exists image_focal_y double precision not null default 50;

create index if not exists events_listing_visibility_starts_idx
  on public.events (listing_kind, visibility, starts_at);

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

-- Audit trail для callback-ов платёжного оператора.
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

-- Атомарное подтверждение заказа: блокирует заказ и событие, проверяет остаток мест,
-- переводит заказ в paid и выпускает билеты в одной транзакции RPC.
create or replace function public.pt_fulfill_paid_order(
  p_order_id uuid,
  p_p24_order_id bigint default null
)
returns table(id uuid, ticket_number text, created_now boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_event record;
  v_sold int;
  v_have int;
  v_need int;
  v_ticket_id uuid;
  v_ticket_number text;
  v_inserted_ids uuid[] := '{}'::uuid[];
  v_attempt int;
begin
  select o.id, o.event_id, o.quantity, o.status
    into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.status not in ('pending', 'paid') then
    raise exception 'order_not_fulfillable';
  end if;

  select e.id, e.total_tickets
    into v_event
  from public.events e
  where e.id = v_order.event_id
  for update;

  if not found then
    raise exception 'event_missing';
  end if;

  select count(*)::int
    into v_have
  from public.tickets t
  where t.order_id = v_order.id;

  if v_have < v_order.quantity then
    v_need := v_order.quantity - v_have;

    select count(*)::int
      into v_sold
    from public.tickets t
    where t.event_id = v_order.event_id;

    if v_event.total_tickets - v_sold < v_need then
      if v_order.status = 'pending' then
        update public.orders o
        set status = 'failed',
            p24_order_id = coalesce(p_p24_order_id, o.p24_order_id)
        where o.id = v_order.id;
      end if;

      return;
    end if;

    if v_order.status = 'pending' then
      update public.orders o
      set status = 'paid',
          p24_order_id = coalesce(p_p24_order_id, o.p24_order_id)
      where o.id = v_order.id;
    elsif p_p24_order_id is not null then
      update public.orders o
      set p24_order_id = coalesce(o.p24_order_id, p_p24_order_id)
      where o.id = v_order.id;
    end if;

    for i in 1..v_need loop
      v_attempt := 0;

      loop
        v_attempt := v_attempt + 1;
        v_ticket_id := gen_random_uuid();
        v_ticket_number := 'TKT-' || upper(encode(gen_random_bytes(3), 'hex'));

        begin
          insert into public.tickets (id, order_id, event_id, ticket_number)
          values (v_ticket_id, v_order.id, v_order.event_id, v_ticket_number);

          v_inserted_ids := array_append(v_inserted_ids, v_ticket_id);
          exit;
        exception
          when unique_violation then
            if v_attempt >= 16 then
              raise exception 'ticket_number_collision';
            end if;
        end;
      end loop;
    end loop;
  elsif v_order.status = 'pending' then
    update public.orders o
    set status = 'paid',
        p24_order_id = coalesce(p_p24_order_id, o.p24_order_id)
    where o.id = v_order.id;
  elsif p_p24_order_id is not null then
    update public.orders o
    set p24_order_id = coalesce(o.p24_order_id, p_p24_order_id)
    where o.id = v_order.id;
  end if;

  return query
    select t.id, t.ticket_number, t.id = any(v_inserted_ids)
    from public.tickets t
    where t.order_id = v_order.id
    order by t.ticket_number;
end;
$$;

revoke all on function public.pt_fulfill_paid_order(uuid, bigint) from public;
grant execute on function public.pt_fulfill_paid_order(uuid, bigint) to service_role;

-- RLS: заказы/билеты — только service role. События: anon видит published + unlisted (списки в приложении фильтруют только published).
alter table public.events enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.checkins enable row level security;
alter table public.payment_callbacks enable row level security;

drop policy if exists "events_select_published" on public.events;
create policy "events_select_published"
  on public.events for select to anon, authenticated
  using (visibility in ('published', 'unlisted'));

grant select on public.events to anon, authenticated;

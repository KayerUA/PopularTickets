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
  day_of_event_price_grosze int check (day_of_event_price_grosze is null or day_of_event_price_grosze > 0),
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
  check (listing_kind in ('performance', 'trial', 'special'));

comment on column public.events.listing_kind is
  'performance = афіша виступів на PopularTickets; trial = пробний слот на popularpoet.pl; special = продаж лише за прямим посиланням.';

alter table public.events
  add column if not exists discount_periods jsonb not null default '[]'::jsonb
  check (jsonb_typeof(discount_periods) = 'array');

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

-- Миграция: оценка мероприятия — `supabase/add-event-ratings.sql`.
alter table public.orders
  add column if not exists rating_invited_at timestamptz;

comment on column public.orders.rating_invited_at is
  'Когда покупателю отправили письмо с персональной ссылкой на оценку этого заказа.';

alter table public.orders
  add column if not exists attribution jsonb;

alter table public.orders
  drop constraint if exists orders_attribution_object;
alter table public.orders
  add constraint orders_attribution_object check (
    attribution is null or coalesce((
      jsonb_typeof(attribution) = 'object'
      and attribution ->> 'version' = '1'
      and jsonb_typeof(attribution -> 'first_touch') = 'object'
    ), false)
  );

comment on column public.orders.attribution is
  'Browser-reported first touch and last non-direct touch, captured before payment. Null for legacy or untracked orders; not proof of advertising causality.';

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

create table if not exists public.event_ratings (
  order_id uuid primary key references public.orders (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete restrict,
  buyer_email text not null,
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint event_ratings_comment_len check (comment is null or char_length(comment) <= 1000)
);

create index if not exists event_ratings_event_id_idx on public.event_ratings (event_id);
create index if not exists event_ratings_created_at_idx on public.event_ratings (created_at);
create unique index if not exists event_ratings_event_email_unique
  on public.event_ratings (event_id, lower(buyer_email));

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
        -- Без pgcrypto.gen_random_bytes (на Supabase расширение часто не включено).
        v_ticket_number := 'TKT-' || upper(
          substring(
            md5(random()::text || clock_timestamp()::text || v_attempt::text || v_order.id::text || i::text)
            from 1
            for 6
          )
        );

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
alter table public.event_ratings enable row level security;
revoke all on table public.event_ratings from anon, authenticated;
grant all on table public.event_ratings to service_role;

drop policy if exists "events_select_published" on public.events;
create policy "events_select_published"
  on public.events for select to anon, authenticated
  using (visibility in ('published', 'unlisted'));

grant select on public.events to anon, authenticated;
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

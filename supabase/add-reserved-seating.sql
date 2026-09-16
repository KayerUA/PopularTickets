-- Apply after schema.sql. Does not enable seating for any event automatically.
begin;
alter table public.orders add column if not exists seating_invited_at timestamptz;
alter table public.orders add column if not exists seating_required boolean not null default false;
alter table public.orders add column if not exists seating_attention boolean not null default false;
alter table public.tickets add column if not exists seat_id text;
create unique index if not exists tickets_event_seat_unique on public.tickets(event_id, seat_id) where seat_id is not null;
create table if not exists public.event_seating (
  event_id uuid primary key references public.events(id),
  mode text not null check (mode in ('priority', 'open')),
  enabled_at timestamptz not null default now(),
  template text not null default 'scena-kocjana' check (template = 'scena-kocjana')
);
create table if not exists public.event_seats (
  event_id uuid not null references public.event_seating(event_id),
  seat_id text not null,
  row_label text not null,
  seat_number text not null,
  row_index int not null,
  column_index int not null,
  blocked boolean not null default false,
  held_order_id uuid references public.orders(id),
  hold_until timestamptz,
  primary key(event_id, seat_id)
);
do $$ begin
  if not exists(select 1 from pg_constraint where conname = 'tickets_event_seat_fk' and conrelid = 'public.tickets'::regclass) then
    alter table public.tickets add constraint tickets_event_seat_fk foreign key(event_id, seat_id) references public.event_seats(event_id, seat_id);
  end if;
end $$;
alter table public.event_seating enable row level security;
alter table public.event_seats enable row level security;

create or replace function public.pt_enable_seating(p_event_id uuid, p_seats jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.events where id = p_event_id and starts_at > now() for update;
  if not found then raise exception 'event_unavailable'; end if;
  if exists(select 1 from public.event_seating where event_id = p_event_id) then return; end if;
  if jsonb_array_length(p_seats) <> 204 or
    (select count(*) from jsonb_array_elements(p_seats) s where (s->>'blocked')::boolean = false) <> 184
    then raise exception 'invalid_map'; end if;
  if (select count(*) from public.tickets where event_id = p_event_id) +
    (select coalesce(sum(quantity),0) from public.orders where event_id = p_event_id and status = 'pending') > 184
    then raise exception 'too_many_tickets'; end if;
  -- enabled_at identifies payments started before activation without locking
  -- orders after the event lock (fulfillment locks in order -> event order).
  insert into public.event_seating(event_id, mode) values(p_event_id, 'priority');
  insert into public.event_seats(event_id, seat_id, row_label, seat_number, row_index, column_index, blocked)
    select p_event_id, s->>'id', s->>'row', s->>'number', (s->>'rowIndex')::int,
      (s->>'column')::int, (s->>'blocked')::boolean from jsonb_array_elements(p_seats) s;
  update public.events set total_tickets = 184 where id = p_event_id;
end $$;

create or replace function public.pt_reserve_seats(p_order_id uuid, p_seat_ids text[])
returns void language plpgsql security definer set search_path = public as $$
declare o record; v_mode text; v_free int; v_reserved int;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.status <> 'pending' then raise exception 'order_unavailable'; end if;
  perform 1 from public.events where id = o.event_id and starts_at > now() for update;
  if not found then raise exception 'event_unavailable'; end if;
  select mode into v_mode from public.event_seating where event_id = o.event_id;
  if v_mode is null then
    if cardinality(p_seat_ids) > 0 then raise exception 'seating_disabled'; end if;
    return;
  end if;
  if v_mode <> 'open' then raise exception 'seating_priority'; end if;
  if coalesce(cardinality(p_seat_ids),0) <> o.quantity or
     (select count(distinct x) from unnest(p_seat_ids) x) <> o.quantity then raise exception 'seat_count'; end if;
  select count(*) into v_free from public.event_seats s
    where s.event_id = o.event_id and s.seat_id = any(p_seat_ids) and not s.blocked
    and (s.held_order_id = o.id or s.hold_until is null or s.hold_until <= now())
    and not exists(select 1 from public.tickets t where t.event_id = s.event_id and t.seat_id = s.seat_id);
  if v_free <> o.quantity then raise exception 'seat_unavailable'; end if;
  select count(*) into v_reserved from public.event_seats where event_id = o.event_id
    and hold_until > now() and held_order_id <> o.id;
  v_reserved := v_reserved + (select coalesce(sum(quantity),0) from public.orders
    where event_id = o.event_id and status = 'pending' and not seating_required
    and created_at <= (select enabled_at from public.event_seating where event_id = o.event_id) and id <> o.id);
  if (select total_tickets from public.events where id = o.event_id) <
     (select count(*) from public.tickets where event_id = o.event_id) + v_reserved + o.quantity
    then raise exception 'no_capacity'; end if;
  update public.event_seats set held_order_id = null, hold_until = null where event_id = o.event_id and held_order_id = o.id;
  update public.event_seats set held_order_id = o.id, hold_until = now() + interval '30 minutes'
    where event_id = o.event_id and seat_id = any(p_seat_ids);
  update public.orders set seating_required = true where id = o.id;
end $$;

create or replace function public.pt_assign_paid_seats(p_order_id uuid, p_seat_ids text[])
returns boolean language plpgsql security definer set search_path = public as $$
declare o record; v_free int; v_ticket record; v_index int := 1;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.status <> 'paid' then raise exception 'order_unavailable'; end if;
  perform 1 from public.events where id = o.event_id and starts_at > now() for update;
  if not found then raise exception 'event_unavailable'; end if;
  if coalesce(cardinality(p_seat_ids),0) <> o.quantity or
    (select count(distinct x) from unnest(p_seat_ids) x) <> o.quantity or
    (select count(*) from public.tickets where order_id = o.id) <> o.quantity then raise exception 'seat_count'; end if;
  -- Idempotent retry; customers cannot move previously assigned seats.
  if (select count(*) from public.tickets where order_id = o.id and seat_id = any(p_seat_ids)) = o.quantity then return false; end if;
  if exists(select 1 from public.tickets where order_id = o.id and (seat_id is not null or used_at is not null))
    then raise exception 'already_assigned'; end if;
  select count(*) into v_free from public.event_seats s
    where s.event_id = o.event_id and s.seat_id = any(p_seat_ids) and not s.blocked
    and (s.hold_until is null or s.hold_until <= now() or s.held_order_id = o.id)
    and not exists(select 1 from public.tickets t where t.event_id = s.event_id and t.seat_id = s.seat_id);
  if v_free <> o.quantity then raise exception 'seat_unavailable'; end if;
  for v_ticket in select id from public.tickets where order_id = o.id order by ticket_number loop
    update public.tickets set seat_id = p_seat_ids[v_index] where id = v_ticket.id;
    v_index := v_index + 1;
  end loop;
  update public.event_seats set held_order_id = null, hold_until = null where event_id = o.event_id and held_order_id = o.id;
  update public.orders set seating_attention = false where id = o.id;
  return true;
end $$;

create or replace function public.pt_seating_mode(p_event_id uuid, p_mode text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.events where id = p_event_id for update;
  if p_mode not in ('priority','open') then raise exception 'invalid_mode'; end if;
  update public.event_seating set mode = p_mode where event_id = p_event_id;
  if not found then raise exception 'seating_disabled'; end if;
end $$;

create or replace function public.pt_block_seat(p_event_id uuid, p_seat_id text, p_blocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.events where id = p_event_id for update;
  if exists(select 1 from public.tickets where event_id = p_event_id and seat_id = p_seat_id) or
     exists(select 1 from public.event_seats where event_id = p_event_id and seat_id = p_seat_id and hold_until > now())
    then raise exception 'seat_unavailable'; end if;
  if not p_blocked and p_seat_id ~ '-1[abcd]$' then raise exception 'side_seat_closed'; end if;
  if p_blocked and (select count(*) from public.event_seats where event_id = p_event_id and not blocked and seat_id <> p_seat_id) <
     (select count(*) from public.tickets where event_id = p_event_id) +
     (select count(*) from public.event_seats where event_id = p_event_id and hold_until > now()) +
     (select coalesce(sum(quantity),0) from public.orders where event_id = p_event_id and status = 'pending' and not seating_required
       and created_at <= (select enabled_at from public.event_seating where event_id = p_event_id))
    then raise exception 'no_capacity'; end if;
  update public.event_seats set blocked = p_blocked where event_id = p_event_id and seat_id = p_seat_id;
  if not found then raise exception 'seat_unavailable'; end if;
  update public.events set total_tickets = (select count(*) from public.event_seats where event_id = p_event_id and not blocked) where id = p_event_id;
end $$;

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
  v_seats text[];
  v_seat_index int := 1;
  v_ticket record;
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

    if v_event.total_tickets - v_sold < v_need and not exists (select 1 from public.event_seating where event_id = v_order.event_id) then
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

  if exists(select 1 from public.event_seating where event_id = v_order.event_id)
    and not exists(select 1 from public.tickets where order_id = v_order.id and seat_id is not null) then
    select array_agg(s.seat_id order by s.row_index, s.column_index) into v_seats
      from public.event_seats s where s.event_id = v_order.event_id and s.held_order_id = v_order.id
      and not s.blocked and not exists(select 1 from public.tickets t where t.event_id = s.event_id and t.seat_id = s.seat_id);
    -- A late payment can outlive its hold. Preserve payment/tickets and flag for
    -- seat selection or refund instead of assigning somebody else's seat.
    if coalesce(cardinality(v_seats),0) = v_order.quantity then
      for v_ticket in select t.id from public.tickets t where t.order_id = v_order.id order by t.ticket_number loop
        update public.tickets t set seat_id = v_seats[v_seat_index] where t.id = v_ticket.id;
        v_seat_index := v_seat_index + 1;
      end loop;
    else
      update public.orders o set seating_attention = true where o.id = v_order.id;
    end if;
    update public.event_seats set held_order_id = null, hold_until = null where event_id = v_order.event_id and held_order_id = v_order.id;
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


revoke all on function public.pt_enable_seating(uuid,jsonb) from public;
grant execute on function public.pt_enable_seating(uuid,jsonb) to service_role;
revoke all on function public.pt_reserve_seats(uuid,text[]) from public;
grant execute on function public.pt_reserve_seats(uuid,text[]) to service_role;
revoke all on function public.pt_assign_paid_seats(uuid,text[]) from public;
grant execute on function public.pt_assign_paid_seats(uuid,text[]) to service_role;
revoke all on function public.pt_seating_mode(uuid,text) from public;
grant execute on function public.pt_seating_mode(uuid,text) to service_role;
revoke all on function public.pt_block_seat(uuid,text,boolean) from public;
grant execute on function public.pt_block_seat(uuid,text,boolean) to service_role;
notify pgrst, 'reload schema';
commit;

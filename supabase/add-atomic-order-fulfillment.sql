-- Atomic order fulfillment for PopularTickets.
-- Run in Supabase SQL Editor before enabling live sales.

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

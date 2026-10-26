-- Run after deploying checkout support for zero-amount orders.
-- This migration is scoped to the 4 October 2026 Boeing-Boeing performance.

alter table public.promo_codes
  add column if not exists required_quantity integer;

alter table public.promo_codes
  drop constraint if exists promo_codes_required_quantity_check;
alter table public.promo_codes
  add constraint promo_codes_required_quantity_check
  check (required_quantity is null or required_quantity between 1 and 20);

do $$
declare constraint_row record;
begin
  for constraint_row in
    select conname from pg_constraint
    where conrelid = 'public.promo_codes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ~ 'discount_percent.*< 100'
  loop
    execute format('alter table public.promo_codes drop constraint %I', constraint_row.conname);
  end loop;
end $$;

alter table public.promo_codes
  drop constraint if exists promo_codes_discount_percent_max_100_check;
alter table public.promo_codes
  add constraint promo_codes_discount_percent_max_100_check
  check (discount_percent is null or discount_percent between 0 and 100);

do $$
declare constraint_row record;
begin
  for constraint_row in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ~ 'amount_grosze.*> 0'
  loop
    execute format('alter table public.orders drop constraint %I', constraint_row.conname);
  end loop;
end $$;

alter table public.orders
  drop constraint if exists orders_amount_grosze_nonnegative_check;
alter table public.orders
  add constraint orders_amount_grosze_nonnegative_check
  check (amount_grosze >= 0);

create or replace function public.pt_enforce_limited_promo_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  promo record;
  used_count integer;
begin
  if new.promo_code_id is null then
    if new.amount_grosze = 0 then
      raise exception 'free_order_requires_promo';
    end if;
    return new;
  end if;

  select p.id, p.event_id, p.scope, p.is_active, p.required_quantity,
         p.max_redemptions, p.discount_type, p.discount_percent
    into promo
    from public.promo_codes p
   where p.id = new.promo_code_id
   for update;

  if not found then
    raise exception 'promo_not_found';
  end if;

  if new.status in ('pending', 'paid') then
    if not promo.is_active or
       (promo.scope = 'event' and promo.event_id is distinct from new.event_id) then
      raise exception 'promo_not_applicable';
    end if;

    if promo.required_quantity is not null and new.quantity <> promo.required_quantity then
      raise exception 'promo_requires_%_tickets', promo.required_quantity;
    end if;

    if promo.max_redemptions is not null then
      select count(*) into used_count
        from public.orders o
       where o.promo_code_id = promo.id
         and o.status in ('pending', 'paid')
         and o.id is distinct from new.id;
      if used_count >= promo.max_redemptions then
        raise exception 'promo_already_used';
      end if;
    end if;

    if new.amount_grosze = 0 and
       (promo.discount_type <> 'percent' or promo.discount_percent <> 100) then
      raise exception 'free_order_requires_100_percent_promo';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists pt_enforce_limited_promo_order on public.orders;
create trigger pt_enforce_limited_promo_order
before insert or update of status, promo_code_id, quantity, amount_grosze
on public.orders
for each row execute function public.pt_enforce_limited_promo_order();

insert into public.promo_codes (
  code, partner_name, discount_type, discount_percent, scope, event_id,
  is_active, max_redemptions, required_quantity, ends_at
)
select
  'BOEING2-7F93K', 'Разовое приглашение: 2 билета', 'percent', 100, 'event',
  '993eb835-3ec4-4795-a113-4278d52921a9'::uuid,
  true, 1, 2, '2026-10-04T17:00:00Z'::timestamptz
where not exists (
  select 1 from public.promo_codes where lower(code) = lower('BOEING2-7F93K')
);

update public.promo_codes
set partner_name = 'Разовое приглашение: 2 билета',
    discount_type = 'percent',
    discount_percent = 100,
    discount_fixed_grosze = null,
    scope = 'event',
    event_id = '993eb835-3ec4-4795-a113-4278d52921a9'::uuid,
    is_active = true,
    max_redemptions = 1,
    required_quantity = 2,
    ends_at = '2026-10-04T17:00:00Z'::timestamptz
where code = 'BOEING2-7F93K';

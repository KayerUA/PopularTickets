-- Позволяет использовать промокод как метку источника без изменения цены.
-- Выполните один раз в Supabase SQL Editor на существующей базе.

do $$
declare
  constraint_row record;
begin
  -- Ранние версии схемы создавали эти ограничения с автоматически выбранным
  -- именем, поэтому ищем их по определению, а не только по имени.
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.promo_codes'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) like '%discount_percent > 0%'
        or pg_get_constraintdef(oid) like '%discount_fixed_grosze > 0%'
      )
  loop
    execute format('alter table public.promo_codes drop constraint %I', constraint_row.conname);
  end loop;
end;
$$;

alter table public.promo_codes
  drop constraint if exists promo_codes_discount_percent_check,
  drop constraint if exists promo_codes_discount_fixed_grosze_check;

alter table public.promo_codes
  add constraint promo_codes_discount_percent_check
    check (discount_percent is null or (discount_percent >= 0 and discount_percent < 100)),
  add constraint promo_codes_discount_fixed_grosze_check
    check (discount_fixed_grosze is null or discount_fixed_grosze >= 0);

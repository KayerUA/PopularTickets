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

notify pgrst, 'reload schema';

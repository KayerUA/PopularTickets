-- Согласие на маркетинговые email при оформлении заказа (PopularTickets checkout).
-- После применения в Supabase: Settings → API → Reload schema cache (если PostgREST кэширует старую схему).

alter table public.orders
  add column if not exists marketing_email_opt_in boolean not null default false;

comment on column public.orders.marketing_email_opt_in is
  'Согласие покупателя на информационные/маркетинговые email (отдельно от транзакционных писем о заказе).';

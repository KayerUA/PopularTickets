-- Оценка купленного мероприятия по персональной ссылке (не маркетинг).
-- Письмо и ссылка — только тем, кто не ставил галочку на рассылку.
-- Одна оценка на человека на каждое мероприятие.
-- После применения в Supabase: Settings → API → Reload schema cache.

alter table public.orders
  add column if not exists rating_invited_at timestamptz;

comment on column public.orders.rating_invited_at is
  'Когда покупателю отправили письмо с персональной ссылкой на оценку этого заказа.';

create table if not exists public.event_ratings (
  order_id uuid primary key references public.orders (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete restrict,
  buyer_email text not null,
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint event_ratings_comment_len check (comment is null or char_length(comment) <= 1000)
);

alter table public.event_ratings add column if not exists buyer_email text;

create index if not exists event_ratings_event_id_idx on public.event_ratings (event_id);
create index if not exists event_ratings_created_at_idx on public.event_ratings (created_at);
create unique index if not exists event_ratings_event_email_unique
  on public.event_ratings (event_id, lower(buyer_email));

comment on table public.event_ratings is
  'Одна оценка на покупателя на мероприятие. Сервисный отзыв, не подписка на рассылку.';

alter table public.event_ratings enable row level security;
revoke all on table public.event_ratings from anon, authenticated;
grant all on table public.event_ratings to service_role;

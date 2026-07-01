-- Редакторы Telegram-бота (назначаются владельцем через /addadmin).
-- Владельцы — TELEGRAM_ADMIN_USER_IDS в Vercel (полный доступ, в т.ч. /addadmin).

create table if not exists public.telegram_bot_admins (
  telegram_user_id bigint primary key,
  username text,
  display_name text,
  added_by bigint,
  created_at timestamptz not null default now()
);

create index if not exists telegram_bot_admins_created_idx
  on public.telegram_bot_admins (created_at desc);

comment on table public.telegram_bot_admins is
  'Delegated Telegram bot operators who can create/publish events (added by owners via /addadmin).';

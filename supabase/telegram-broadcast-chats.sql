-- Группы Telegram для рассылки афиши (авто-регистрация при добавлении бота админом).
-- Выполните в Supabase SQL Editor.

create table if not exists public.telegram_broadcast_chats (
  chat_id bigint primary key,
  chat_title text not null default '',
  chat_type text not null default 'supergroup',
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_broadcast_chats_updated_idx
  on public.telegram_broadcast_chats (updated_at desc);

comment on table public.telegram_broadcast_chats is
  'Telegram groups/channels where the bot is admin and receives event broadcast posts.';

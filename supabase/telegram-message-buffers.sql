-- Буферы Telegram-бота (альбом / фото+текст отдельными сообщениями) — shared между serverless-инстансами.
-- Выполните в Supabase SQL Editor.

create table if not exists public.telegram_message_buffers (
  id text primary key,
  chat_id bigint not null,
  user_id bigint not null,
  text_content text not null default '',
  file_ids jsonb not null default '[]'::jsonb,
  flags jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists telegram_message_buffers_chat_idx
  on public.telegram_message_buffers (chat_id);

comment on table public.telegram_message_buffers is
  'Временные буферы афиши и media_group для Telegram-бота (Vercel serverless).';

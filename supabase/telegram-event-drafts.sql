-- Черновики Telegram-бота (preview / уточнения) до нажатия «Опубликовать».
-- Выполните в Supabase SQL Editor (service role использует таблицу из Next.js).

create table if not exists public.telegram_event_drafts (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id bigint not null,
  telegram_user_id bigint not null,
  status text not null default 'preview'
    check (status in ('awaiting_clarification', 'preview', 'published', 'cancelled')),
  source_text text not null default '',
  image_file_id text,
  parsed jsonb not null,
  missing_fields text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists telegram_event_drafts_chat_idx
  on public.telegram_event_drafts (telegram_chat_id, created_at desc);

comment on table public.telegram_event_drafts is
  'Pending event payloads from Telegram bot before inline publish confirm.';

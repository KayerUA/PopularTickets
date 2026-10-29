create table if not exists public.search_console_state (
  site_url text primary key,
  sitemap_hash text,
  submitted_at timestamptz,
  attempted_at timestamptz,
  last_error text,
  inspection_report jsonb not null default '[]'::jsonb,
  inspected_at timestamptz,
  lock_token uuid,
  locked_until timestamptz
);

alter table public.search_console_state enable row level security;
revoke all on public.search_console_state from anon, authenticated;
grant select, insert, update on public.search_console_state to service_role;

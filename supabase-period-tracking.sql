alter table public.profiles
  add column if not exists cycle_tracking_enabled boolean not null default false;

alter table public.profiles
  add column if not exists cycle_tracking_consent_completed boolean not null default false;

create table if not exists public.period_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists period_entries_user_start_idx
  on public.period_entries (user_id, start_date desc);

alter table public.period_entries enable row level security;

drop policy if exists "Users read own period entries" on public.period_entries;
create policy "Users read own period entries" on public.period_entries
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own period entries" on public.period_entries;
create policy "Users insert own period entries" on public.period_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own period entries" on public.period_entries;
create policy "Users update own period entries" on public.period_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own period entries" on public.period_entries;
create policy "Users delete own period entries" on public.period_entries
  for delete using (auth.uid() = user_id);

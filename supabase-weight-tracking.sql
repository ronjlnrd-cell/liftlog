create table if not exists public.bodyweight_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric(6,2) not null check (weight > 0),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists bodyweight_entries_user_recorded_idx
  on public.bodyweight_entries (user_id, recorded_at desc);

alter table public.bodyweight_entries enable row level security;

drop policy if exists "Users read own bodyweight" on public.bodyweight_entries;
create policy "Users read own bodyweight" on public.bodyweight_entries for select using (auth.uid() = user_id);
drop policy if exists "Users insert own bodyweight" on public.bodyweight_entries;
create policy "Users insert own bodyweight" on public.bodyweight_entries for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own bodyweight" on public.bodyweight_entries;
create policy "Users update own bodyweight" on public.bodyweight_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users delete own bodyweight" on public.bodyweight_entries;
create policy "Users delete own bodyweight" on public.bodyweight_entries for delete using (auth.uid() = user_id);

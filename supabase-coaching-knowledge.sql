create table if not exists public.workout_context_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists workout_context_entries_user_created_idx
  on public.workout_context_entries (user_id, created_at desc);

create index if not exists workout_context_entries_user_workout_idx
  on public.workout_context_entries (user_id, workout_id);

alter table public.workout_context_entries enable row level security;

drop policy if exists "Users read own workout context entries" on public.workout_context_entries;
create policy "Users read own workout context entries" on public.workout_context_entries
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own workout context entries" on public.workout_context_entries;
create policy "Users insert own workout context entries" on public.workout_context_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own workout context entries" on public.workout_context_entries;
create policy "Users update own workout context entries" on public.workout_context_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.exercise_setup_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null,
  workout_exercise_id text not null,
  exercise_id text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists exercise_setup_entries_user_created_idx
  on public.exercise_setup_entries (user_id, created_at desc);

create index if not exists exercise_setup_entries_user_exercise_idx
  on public.exercise_setup_entries (user_id, exercise_id, created_at desc);

alter table public.exercise_setup_entries enable row level security;

drop policy if exists "Users read own exercise setup entries" on public.exercise_setup_entries;
create policy "Users read own exercise setup entries" on public.exercise_setup_entries
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own exercise setup entries" on public.exercise_setup_entries;
create policy "Users insert own exercise setup entries" on public.exercise_setup_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own exercise setup entries" on public.exercise_setup_entries;
create policy "Users update own exercise setup entries" on public.exercise_setup_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.coach_observation_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null,
  workout_exercise_id text not null,
  exercise_id text not null,
  set_order integer not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_observation_entries_user_created_idx
  on public.coach_observation_entries (user_id, created_at desc);

create index if not exists coach_observation_entries_user_exercise_idx
  on public.coach_observation_entries (user_id, exercise_id, created_at desc);

alter table public.coach_observation_entries enable row level security;

drop policy if exists "Users read own coach observation entries" on public.coach_observation_entries;
create policy "Users read own coach observation entries" on public.coach_observation_entries
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own coach observation entries" on public.coach_observation_entries;
create policy "Users insert own coach observation entries" on public.coach_observation_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own coach observation entries" on public.coach_observation_entries;
create policy "Users update own coach observation entries" on public.coach_observation_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.workout_context_entries
  add column if not exists source_template_id uuid;

alter table public.exercise_setup_entries
  add column if not exists source_template_id uuid;

alter table public.coach_observation_entries
  add column if not exists source_template_id uuid;

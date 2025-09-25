-- Supabase schema for EasyStyle (Phase 1)
-- Enable required extensions
create extension if not exists pgcrypto;

-- profiles: one row per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Only the user can access their profile
create policy if not exists "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy if not exists "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy if not exists "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- style_requests: track AI styling generations
create table if not exists public.style_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  prompt text not null,
  model_provider text not null default 'gemini',
  created_at timestamptz not null default now()
);

alter table public.style_requests enable row level security;
create policy if not exists "style_requests_user_rw" on public.style_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- purchase_requests: track purchase intents
create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  items jsonb not null,
  total_krw numeric(12,2) not null,
  created_at timestamptz not null default now()
);

alter table public.purchase_requests enable row level security;
create policy if not exists "purchase_requests_user_rw" on public.purchase_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


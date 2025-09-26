-- Supabase schema for EasyStyle (Phase 1)
-- Enable required extensions
create extension if not exists pgcrypto;

-- helper: check admin role
drop function if exists public.is_admin(uuid);
create function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'admin'
  );
$$;

-- profiles: one row per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  phone text,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'active' check (status in ('active','inactive','banned')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure new columns exist when running against an existing DB
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone'
  ) then
    alter table public.profiles add column phone text;
  end if;
end $$;

alter table public.profiles enable row level security;

-- Only the user can access their profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- admin read access to profiles
drop policy if exists "profiles_admin_ro" on public.profiles;
create policy "profiles_admin_ro" on public.profiles
  for select using (public.is_admin(auth.uid()));
-- admin can update any profile (role/status)
drop policy if exists "profiles_admin_rw" on public.profiles;
create policy "profiles_admin_rw" on public.profiles
  for update using (public.is_admin(auth.uid()));

-- style_requests: track AI styling generations
create table if not exists public.style_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  prompt text not null,
  model_provider text not null default 'gemini',
  created_at timestamptz not null default now()
);

alter table public.style_requests enable row level security;
drop policy if exists "style_requests_user_rw" on public.style_requests;
create policy "style_requests_user_rw" on public.style_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- purchase_requests: track purchase intents
create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  items jsonb not null,
  total_krw numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','ordered','completed')),
  admin_notes text,
  created_at timestamptz not null default now()
);

alter table public.purchase_requests enable row level security;
-- auth_events: 로그인/로그아웃/가입 이벤트 로그 (관리용)
create table if not exists public.auth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null check (event_type in ('signup','login','logout','reset')),
  user_agent text,
  ip inet,
  created_at timestamptz not null default now()
);

alter table public.auth_events enable row level security;
drop policy if exists "auth_events_own_ro" on public.auth_events;
create policy "auth_events_own_ro" on public.auth_events
  for select using (auth.uid() = user_id);
drop policy if exists "auth_events_insert_own" on public.auth_events;
create policy "auth_events_insert_own" on public.auth_events
  for insert with check (auth.uid() = user_id);
-- admin read access to all auth events
drop policy if exists "auth_events_admin_ro" on public.auth_events;
create policy "auth_events_admin_ro" on public.auth_events
  for select using (public.is_admin(auth.uid()));

drop policy if exists "purchase_requests_user_rw" on public.purchase_requests;
create policy "purchase_requests_user_rw" on public.purchase_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- admin full access to purchase requests
drop policy if exists "purchase_requests_admin_rw" on public.purchase_requests;
create policy "purchase_requests_admin_rw" on public.purchase_requests
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Admin: 검색 잡과 결과 (상품검색 Agent)
create table if not exists public.search_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  query text not null,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  created_at timestamptz not null default now()
);

alter table public.search_jobs enable row level security;
drop policy if exists "search_jobs_user_rw" on public.search_jobs;
create policy "search_jobs_user_rw" on public.search_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- admin read access to all jobs
drop policy if exists "search_jobs_admin_ro" on public.search_jobs;
create policy "search_jobs_admin_ro" on public.search_jobs
  for select using (public.is_admin(auth.uid()));
-- admin can update job status
drop policy if exists "search_jobs_admin_rw" on public.search_jobs;
create policy "search_jobs_admin_rw" on public.search_jobs
  for update using (public.is_admin(auth.uid()));

create table if not exists public.search_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.search_jobs(id) on delete cascade,
  source text not null, -- e.g., musinsa, 29cm, wconcept
  title text not null,
  price numeric(12,2),
  url text not null,
  image_url text,
  in_stock boolean,
  created_at timestamptz not null default now()
);

alter table public.search_results enable row level security;
drop policy if exists "search_results_job_owner_ro" on public.search_results;
create policy "search_results_job_owner_ro" on public.search_results
  for select using (exists (
    select 1 from public.search_jobs j where j.id = job_id and j.user_id = auth.uid()
  ));
-- admin read access to all results
drop policy if exists "search_results_admin_ro" on public.search_results;
create policy "search_results_admin_ro" on public.search_results
  for select using (public.is_admin(auth.uid()));

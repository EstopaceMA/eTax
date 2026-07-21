create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taxpayer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taxpayer_type text not null,
  work_type text not null,
  registration_status text not null,
  tin_status text not null,
  rdo text,
  filing_frequency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null check (status in ('draft', 'ready', 'filed', 'paid', 'blocked')),
  sort_order integer not null,
  handoff_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  required boolean not null default true,
  status text not null check (status in ('missing', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  due_date date not null,
  status text not null check (status in ('upcoming', 'due_soon', 'completed', 'overdue')),
  channel text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.filing_obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  form_name text not null,
  period text not null,
  due_date date not null,
  status text not null check (status in ('draft', 'ready', 'filed', 'paid')),
  payment_status text not null check (payment_status in ('unpaid', 'paid', 'not_required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mock_filing_modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  url text,
  external boolean not null default false
);

alter table public.profiles enable row level security;
alter table public.taxpayer_profiles enable row level security;
alter table public.roadmap_steps enable row level security;
alter table public.document_checklist_items enable row level security;
alter table public.deadlines enable row level security;
alter table public.filing_obligations enable row level security;
alter table public.mock_filing_modules enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Users can create own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users can manage own taxpayer profile"
  on public.taxpayer_profiles for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage own roadmap"
  on public.roadmap_steps for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage own documents"
  on public.document_checklist_items for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage own deadlines"
  on public.deadlines for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage own filing obligations"
  on public.filing_obligations for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Authenticated users can read mock filing modules"
  on public.mock_filing_modules for select
  to authenticated
  using (true);

insert into public.mock_filing_modules (key, name, description, url, external)
values
  (
    'profile-review',
    'Profile review',
    'Review taxpayer category, TIN status, registration status, and filing cadence before preparing a mock return.',
    null,
    false
  ),
  (
    'readiness-check',
    'Readiness check',
    'Confirm required profile details and checklist items before starting a mock filing.',
    null,
    false
  ),
  (
    'mock-submit',
    'Mock filing submission',
    'Simulate reviewing a return, submitting it, and moving the obligation to filed status.',
    null,
    false
  ),
  (
    'mock-payment',
    'Mock payment status',
    'Practice marking a simulated payment as unpaid, paid, or not required.',
    null,
    false
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  url = excluded.url,
  external = excluded.external;

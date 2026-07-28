-- Dev/staging-only helper table.
-- An admin pastes a freshly generated exchange code here (Supabase table editor)
-- so the app can run the real eGov SSO flow without an eGov redirect integration.
-- Exchange codes are single-use; when one is absent or already spent the app
-- falls back to the stored profile in public.egov_sso_profiles.
create table if not exists public.egov_sso_exchange_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  exchange_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.egov_sso_exchange_codes enable row level security;
insert into public.egov_sso_exchange_codes (email)
values
  ('josie@yopmail.com'),
  ('josie01@yopmail.com'),
  ('josie02@yopmail.com'),
  ('josie03@yopmail.com'),
  ('josie04@yopmail.com')
on conflict (email) do nothing;

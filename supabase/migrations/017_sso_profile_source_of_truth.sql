-- 013 enabled row level security on egov_sso_profiles but never added a policy,
-- which locked the table to service-role code only. Let taxpayers read their
-- own eGov record so the app can source name, contact and TIN from it.
create policy "Taxpayers read own eGov SSO profile"
  on public.egov_sso_profiles for select
  using (auth.uid() = user_id);

-- egov_sso_exchange_codes stays policy-less on purpose: admin-managed codes,
-- server-side reads only.

-- Name, mobile and TIN now come from egov_sso_profiles, so drop the duplicates.
alter table public.taxpayer_profiles
drop column if exists mobile_number,
drop column if exists tin_status;

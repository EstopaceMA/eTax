do $$
begin
  if to_regclass('public.portal_handoffs') is not null
     and to_regclass('public.mock_filing_modules') is null then
    alter table public.portal_handoffs rename to mock_filing_modules;
  end if;
end $$;

create table if not exists public.mock_filing_modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  url text,
  external boolean not null default false
);

alter table public.mock_filing_modules
  alter column url drop not null,
  alter column external set default false;

alter table public.mock_filing_modules enable row level security;

drop policy if exists "Authenticated users can read portal handoffs"
  on public.mock_filing_modules;

drop policy if exists "Authenticated users can read mock filing modules"
  on public.mock_filing_modules;

create policy "Authenticated users can read mock filing modules"
  on public.mock_filing_modules for select
  to authenticated
  using (true);

delete from public.mock_filing_modules
where key in ('bir-home', 'bir-eservices', 'efps', 'eappointment', 'orus');

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

do $$
begin
  if to_regclass('public.roadmap_steps') is not null then
    update public.roadmap_steps
    set handoff_key = case handoff_key
      when 'orus' then 'profile-review'
      when 'bir-eservices' then 'readiness-check'
      when 'efps' then 'mock-submit'
      else handoff_key
    end
    where handoff_key in ('orus', 'bir-eservices', 'efps');

    update public.roadmap_steps
    set
      title = case title
        when 'File through the official channel' then 'Complete mock filing'
        else title
      end,
      description = case
        when description like '%official BIR channel%' then
          'Check whether required documents and status fields are complete before starting a mock filing.'
        when description like '%BIR filing service%' then
          'Review the simulated filing details and submit the mock return inside eTax.'
        when description like '%official transaction%' then
          'Update your mock filing and payment status so the compliance tracker stays current.'
        else description
      end;
  end if;
end $$;

update public.deadlines
set channel = case
  when channel in ('BIR eServices', 'eFPS or eBIRForms') then 'Mock filing'
  when channel = 'ORUS' then 'Profile review'
  else channel
end;

-- The real BIR 1701Q computation for the 8% income tax option, alongside the
-- existing demo rules. Nothing that reads the demo rules changes.
--
-- Rates, the annual reduction and the VAT ceiling live in configuration rather
-- than in code, so a change in the law is a new row with a new effective_from
-- and old filings keep computing under the rule that was in force.
insert into public.tax_rule_sets (
  id,
  version,
  title,
  status,
  effective_from,
  effective_to,
  source_title,
  source_url,
  configuration
)
values (
  'bir-1701q-eight-percent',
  '2018.01',
  'BIR Form 1701Q - 8% income tax on gross sales/receipts',
  'active',
  '2018-01-01',
  null,
  'RA 10963 (TRAIN) as implemented by RR 8-2018',
  'https://www.bir.gov.ph/',
  '{
    "kind": "eight_percent_gross",
    "currency": "PHP",
    "rate": "0.08",
    "annualReduction": "250000",
    "vatThreshold": "3000000",
    "reductionEligibleCategories": ["self_employed_professional", "single_proprietor"],
    "rounding": "whole_peso"
  }'::jsonb
)
on conflict (id) do update set
  version = excluded.version,
  title = excluded.title,
  status = excluded.status,
  effective_from = excluded.effective_from,
  effective_to = excluded.effective_to,
  source_title = excluded.source_title,
  source_url = excluded.source_url,
  configuration = excluded.configuration;

-- The 8% option must be elected on the first quarterly return and is
-- irrevocable for that taxable year. Null means no election, i.e. graduated
-- rates apply.
alter table public.taxpayer_profiles
add column if not exists eight_percent_elected_year integer;

-- Existing demo taxpayers are all treated as having elected 8% for 2026.
update public.taxpayer_profiles
set eight_percent_elected_year = 2026
where eight_percent_elected_year is null;

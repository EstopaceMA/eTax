alter table public.income_record_uploads
  add column if not exists content_hash text;

create index if not exists income_record_uploads_content_hash_idx
  on public.income_record_uploads (user_id, content_hash)
  where content_hash is not null;

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
  'demo-gross-income-six-percent-2026',
  'demo-2026.07.2',
  '2026 illustrative six-percent gross-income rule',
  'demo',
  '2026-01-01',
  '2026-12-31',
  'eTaxPH controlled pilot fixture - not an official tax authority',
  null,
  '{"kind":"gross_income_rate","currency":"PHP","rate":"0.06","rounding":"2dp","deductions":false,"credits":false}'::jsonb
)
on conflict (id) do update set
  version = excluded.version,
  title = excluded.title,
  status = excluded.status,
  configuration = excluded.configuration;

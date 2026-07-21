insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@etax.local',
  crypt('DemoPass123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Mika Santos"}',
  now(),
  now()
)
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '{"sub": "11111111-1111-4111-8111-111111111111", "email": "demo@etax.local"}',
  'email',
  'demo@etax.local',
  now(),
  now(),
  now()
)
on conflict (id) do update set
  identity_data = excluded.identity_data,
  provider = excluded.provider,
  provider_id = excluded.provider_id,
  updated_at = excluded.updated_at;

insert into public.profiles (id, email, full_name)
values (
  '11111111-1111-4111-8111-111111111111',
  'demo@etax.local',
  'Mika Santos'
)
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name;

insert into public.taxpayer_profiles (
  id,
  user_id,
  taxpayer_type,
  work_type,
  registration_status,
  tin_status,
  rdo,
  filing_frequency
)
values (
  '21111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'Self-employed professional / freelancer',
  'Self-employed professional',
  'Already registered',
  'TIN available',
  'RDO on record',
  'Quarterly and monthly checks'
)
on conflict (id) do update set
  taxpayer_type = excluded.taxpayer_type,
  work_type = excluded.work_type,
  registration_status = excluded.registration_status,
  tin_status = excluded.tin_status,
  rdo = excluded.rdo,
  filing_frequency = excluded.filing_frequency;

insert into public.roadmap_steps (
  id,
  user_id,
  title,
  description,
  status,
  sort_order,
  handoff_key
)
values
  (
    '31111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Confirm registered taxpayer profile',
    'Review your TIN, RDO, registration status, and filing cadence before preparing a return.',
    'filed',
    1,
    'profile-review'
  ),
  (
    '31111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    'Prepare filing documents',
    'Gather registration details, income records, expense notes, and prior payment references.',
    'ready',
    2,
    null
  ),
  (
    '31111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    'Run pre-filing readiness',
    'Check whether required documents and status fields are complete before starting a mock filing.',
    'ready',
    3,
    'readiness-check'
  ),
  (
    '31111111-1111-4111-8111-111111111114',
    '11111111-1111-4111-8111-111111111111',
    'Complete mock filing',
    'Review the simulated filing details and submit the mock return inside eTax.',
    'draft',
    4,
    'mock-submit'
  ),
  (
    '31111111-1111-4111-8111-111111111115',
    '11111111-1111-4111-8111-111111111111',
    'Mark filed and paid',
    'Update your mock filing and payment status so the compliance tracker stays current.',
    'draft',
    5,
    null
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  sort_order = excluded.sort_order,
  handoff_key = excluded.handoff_key;

insert into public.document_checklist_items (
  id,
  user_id,
  title,
  description,
  required,
  status
)
values
  (
    '41111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Certificate of Registration details',
    'Keep registration details nearby to confirm tax types and RDO for the mock filing.',
    true,
    'complete'
  ),
  (
    '41111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    'TIN and registered address',
    'Confirm your TIN and registered address before using the mock filing flow.',
    true,
    'complete'
  ),
  (
    '41111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    'Income records for the filing period',
    'Prepare invoices, platform payouts, client remittances, or other income summaries.',
    true,
    'missing'
  ),
  (
    '41111111-1111-4111-8111-111111111114',
    '11111111-1111-4111-8111-111111111111',
    'Deductible expense notes',
    'Gather receipts or notes you plan to reference while preparing your return.',
    false,
    'missing'
  ),
  (
    '41111111-1111-4111-8111-111111111115',
    '11111111-1111-4111-8111-111111111111',
    'Prior filing or payment references',
    'Save reference numbers from any previous filing or payment record you want to track.',
    false,
    'complete'
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  required = excluded.required,
  status = excluded.status;

insert into public.deadlines (
  id,
  user_id,
  title,
  description,
  due_date,
  status,
  channel
)
values
  (
    '51111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Quarterly income tax preparation',
    'Review income records and missing checklist items before starting mock filing.',
    '2026-08-15',
    'due_soon',
    'Mock filing'
  ),
  (
    '51111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    'Monthly percentage tax review',
    'Confirm whether this obligation applies to your registered tax type before proceeding.',
    '2026-08-20',
    'upcoming',
    'Mock filing'
  ),
  (
    '51111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    'Registration record check',
    'Review whether any profile details should be updated before your mock workflow.',
    '2026-09-05',
    'upcoming',
    'Profile review'
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  due_date = excluded.due_date,
  status = excluded.status,
  channel = excluded.channel;

insert into public.filing_obligations (
  id,
  user_id,
  form_name,
  period,
  due_date,
  status,
  payment_status
)
values
  (
    '61111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Quarterly income tax return',
    'Q2 2026',
    '2026-08-15',
    'ready',
    'unpaid'
  ),
  (
    '61111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    'Monthly percentage tax',
    'July 2026',
    '2026-08-20',
    'draft',
    'unpaid'
  ),
  (
    '61111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    'Registration profile review',
    '2026 annual check',
    '2026-09-05',
    'draft',
    'not_required'
  )
on conflict (id) do update set
  form_name = excluded.form_name,
  period = excluded.period,
  due_date = excluded.due_date,
  status = excluded.status,
  payment_status = excluded.payment_status;

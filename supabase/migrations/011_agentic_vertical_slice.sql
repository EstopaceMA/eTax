alter table public.income_record_uploads
  add column if not exists extraction_status text not null default 'provisional',
  add column if not exists extraction_confidence numeric(4, 3),
  add column if not exists extracted_text text,
  add column if not exists confirmed_at timestamptz;

alter table public.income_record_uploads
  drop constraint if exists income_record_uploads_extraction_status_check;

alter table public.income_record_uploads
  add constraint income_record_uploads_extraction_status_check
  check (extraction_status in ('provisional', 'confirmed', 'needs_review'));

alter table public.filing_obligations
  drop constraint if exists filing_obligations_status_check;

alter table public.filing_obligations
  add constraint filing_obligations_status_check
  check (status in (
    'draft', 'review', 'ready', 'handed_off', 'pending_verification',
    'filed', 'paid', 'blocked', 'exception'
  ));

alter table public.filing_obligations
  drop constraint if exists filing_obligations_payment_status_check;

alter table public.filing_obligations
  add constraint filing_obligations_payment_status_check
  check (payment_status in (
    'unpaid', 'approval_required', 'handed_off', 'pending_verification',
    'paid', 'not_required', 'blocked', 'exception'
  ));

create table if not exists public.tax_rule_sets (
  id text primary key,
  version text not null,
  title text not null,
  status text not null check (status in ('demo', 'active', 'retired')),
  effective_from date not null,
  effective_to date,
  source_title text not null,
  source_url text,
  last_validated_at timestamptz,
  configuration jsonb not null,
  created_at timestamptz not null default now()
);

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
  'demo-fixed-liability-q2-2026',
  'demo-2026.07.1',
  'Q2 2026 controlled demo liability',
  'demo',
  '2026-04-01',
  '2026-06-30',
  'eTaxPH controlled pilot fixture - not an official tax authority',
  null,
  '{"kind":"fixed_liability","currency":"PHP","amount":"7440.00","rounding":"2dp"}'::jsonb
)
on conflict (id) do update set
  version = excluded.version,
  title = excluded.title,
  status = excluded.status,
  configuration = excluded.configuration;

create table if not exists public.computation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filing_obligation_id uuid not null references public.filing_obligations(id) on delete cascade,
  rule_set_id text not null references public.tax_rule_sets(id),
  input_hash text not null,
  input_snapshot jsonb not null,
  output_snapshot jsonb not null,
  trace jsonb not null,
  assumptions jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  supersedes_id uuid references public.computation_runs(id),
  created_at timestamptz not null default now(),
  unique (user_id, filing_obligation_id, rule_set_id, input_hash)
);

create table if not exists public.return_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filing_obligation_id uuid not null references public.filing_obligations(id) on delete cascade,
  computation_run_id uuid not null references public.computation_runs(id),
  version integer not null default 1,
  state text not null check (state in (
    'review', 'approved', 'handed_off', 'pending_verification',
    'filed', 'exception'
  )),
  review_snapshot jsonb not null,
  validations jsonb not null default '[]'::jsonb,
  acknowledgement_reference text,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, filing_obligation_id, computation_run_id)
);

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filing_obligation_id uuid not null references public.filing_obligations(id) on delete cascade,
  task_type text not null,
  owner_agent text not null,
  state text not null check (state in (
    'proposed', 'gathering', 'blocked', 'ready_for_review', 'approved',
    'executing', 'completed', 'exception'
  )),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'material')),
  confidence numeric(4, 3) not null,
  title text not null,
  reason text not null,
  blocker text,
  action_label text not null,
  action_href text not null,
  evidence jsonb not null default '[]'::jsonb,
  expected_output jsonb not null default '[]'::jsonb,
  rule_set_id text references public.tax_rule_sets(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, filing_obligation_id, task_type)
);

create table if not exists public.approval_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_task_id uuid not null references public.agent_tasks(id) on delete cascade,
  action_type text not null,
  target_type text not null,
  target_id uuid not null,
  payload_hash text not null,
  payload_snapshot jsonb not null,
  status text not null check (status in ('approved', 'consumed', 'expired', 'revoked')),
  approved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create table if not exists public.agent_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filing_obligation_id uuid references public.filing_obligations(id) on delete cascade,
  agent_task_id uuid references public.agent_tasks(id) on delete set null,
  exception_type text not null,
  title text not null,
  detail text not null,
  state text not null check (state in ('open', 'resolved')),
  recovery_action text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filing_obligation_id uuid not null references public.filing_obligations(id) on delete cascade,
  approval_id uuid not null references public.approval_artifacts(id),
  transaction_id text not null unique,
  amount numeric(14, 2) not null,
  currency text not null default 'PHP',
  channel text not null,
  state text not null check (state in (
    'approved', 'handed_off', 'pending_verification', 'verified', 'exception'
  )),
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_intent_id uuid not null references public.payment_intents(id) on delete cascade,
  original_filename text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  reference text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_type text not null check (actor_type in ('user', 'agent', 'system', 'external')),
  actor_id text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('payment-evidence', 'payment-evidence', false)
on conflict (id) do nothing;

alter table public.tax_rule_sets enable row level security;
alter table public.computation_runs enable row level security;
alter table public.return_drafts enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.approval_artifacts enable row level security;
alter table public.agent_exceptions enable row level security;
alter table public.payment_intents enable row level security;
alter table public.payment_evidence enable row level security;
alter table public.audit_events enable row level security;

create policy "Authenticated users can read tax rule sets"
  on public.tax_rule_sets for select to authenticated using (true);

create policy "Users can read own computation runs"
  on public.computation_runs for select to authenticated using (user_id = auth.uid());
create policy "Users can create own computation runs"
  on public.computation_runs for insert to authenticated with check (user_id = auth.uid());

create policy "Users can manage own return drafts"
  on public.return_drafts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can manage own agent tasks"
  on public.agent_tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can read own approval artifacts"
  on public.approval_artifacts for select to authenticated using (user_id = auth.uid());
create policy "Users can create own approval artifacts"
  on public.approval_artifacts for insert to authenticated with check (user_id = auth.uid());
create policy "Users can consume own approval artifacts"
  on public.approval_artifacts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can manage own exceptions"
  on public.agent_exceptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can manage own payment intents"
  on public.payment_intents for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can create own payment evidence"
  on public.payment_evidence for insert to authenticated with check (user_id = auth.uid());
create policy "Users can read own payment evidence"
  on public.payment_evidence for select to authenticated using (user_id = auth.uid());

create policy "Users can append own audit events"
  on public.audit_events for insert to authenticated with check (user_id = auth.uid());
create policy "Users can read own audit events"
  on public.audit_events for select to authenticated using (user_id = auth.uid());

create policy "Users can read own payment evidence files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users can upload own payment evidence files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create index if not exists agent_tasks_next_action_idx
  on public.agent_tasks (user_id, filing_obligation_id, state, updated_at desc);
create index if not exists audit_events_target_idx
  on public.audit_events (user_id, target_type, target_id, created_at desc);
create index if not exists approval_artifacts_payload_idx
  on public.approval_artifacts (user_id, payload_hash, approved_at desc);

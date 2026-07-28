create table if not exists public.agentic_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New filing chat',
  title_is_custom boolean not null default false,
  active_quarter smallint check (active_quarter between 1 and 4),
  active_context_id uuid,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  constraint agentic_chat_sessions_title_check
    check (char_length(btrim(title)) between 1 and 80),
  unique (id, user_id)
);

create table if not exists public.agentic_chat_events (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint generated always as identity,
  session_id uuid not null,
  user_id uuid not null,
  context_id uuid,
  role text not null check (role in ('user', 'assistant')),
  kind text not null check (kind in (
    'user_text',
    'assistant_text',
    'assistant_data',
    'switch_to_ask',
    'period_selection',
    'period_context',
    'workflow_stage'
  )),
  content text not null,
  quarter smallint check (quarter between 1 and 4),
  stage text check (stage in ('records', 'review', 'handoff', 'payment')),
  topic text check (topic in (
    'summary', 'records', 'computation', 'deadline',
    'filing', 'payment', 'blocker', 'next_step'
  )),
  facts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(facts) = 'array'),
  snapshot_version text,
  client_request_id uuid,
  reply_to_event_id uuid references public.agentic_chat_events(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint agentic_chat_events_session_owner_fkey
    foreign key (session_id, user_id)
    references public.agentic_chat_sessions(id, user_id)
    on delete cascade,
  constraint agentic_chat_events_content_check
    check (char_length(btrim(content)) between 1 and 4000),
  constraint agentic_chat_events_workflow_shape_check
    check (
      (kind = 'workflow_stage' and quarter is not null and stage is not null and context_id is not null)
      or
      (kind <> 'workflow_stage' and stage is null)
    )
);

create unique index if not exists agentic_chat_events_client_request_idx
  on public.agentic_chat_events (session_id, client_request_id)
  where client_request_id is not null;

create unique index if not exists agentic_chat_events_reply_idx
  on public.agentic_chat_events (session_id, reply_to_event_id)
  where reply_to_event_id is not null;

create unique index if not exists agentic_chat_events_context_stage_idx
  on public.agentic_chat_events (session_id, context_id, stage)
  where kind = 'workflow_stage';

create index if not exists agentic_chat_sessions_recent_idx
  on public.agentic_chat_sessions (user_id, updated_at desc);

create index if not exists agentic_chat_sessions_opened_idx
  on public.agentic_chat_sessions (user_id, last_opened_at desc);

create index if not exists agentic_chat_events_order_idx
  on public.agentic_chat_events (user_id, session_id, sequence_number desc);

alter table public.agentic_chat_sessions enable row level security;
alter table public.agentic_chat_events enable row level security;

create policy "Users can read own agentic chat sessions"
  on public.agentic_chat_sessions for select to authenticated
  using (user_id = auth.uid());

create policy "Users can read own agentic chat events"
  on public.agentic_chat_events for select to authenticated
  using (user_id = auth.uid());

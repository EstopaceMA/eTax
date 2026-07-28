alter table public.agentic_chat_sessions
  add column if not exists pinned_at timestamptz;

create index if not exists agentic_chat_sessions_pinned_idx
  on public.agentic_chat_sessions (user_id, pinned_at desc)
  where pinned_at is not null;

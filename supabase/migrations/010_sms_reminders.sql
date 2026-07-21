alter table public.filing_obligations
add column if not exists generated_pdf_at timestamptz;

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filing_obligation_id uuid references public.filing_obligations(id) on delete cascade,
  channel text not null check (channel in ('sms')),
  recipient text not null,
  message text not null,
  reminder_day integer,
  mode text not null check (mode in ('dry_run', 'sent')),
  provider_status text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notification_logs enable row level security;

create policy "Users can manage own notification logs"
  on public.notification_logs for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create unique index if not exists notification_logs_sms_sent_once
  on public.notification_logs (user_id, filing_obligation_id, reminder_day, recipient, mode)
  where mode = 'sent';

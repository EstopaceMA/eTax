insert into storage.buckets (id, name, public)
values ('income-records', 'income-records', false)
on conflict (id) do nothing;

create table if not exists public.income_record_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quarter integer not null check (quarter between 1 and 4),
  period text not null,
  original_filename text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  total_income numeric(14, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.income_record_uploads enable row level security;

create policy "Users can manage own income records"
  on public.income_record_uploads for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can read own income record files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'income-records'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload own income record files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'income-records'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own income record files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'income-records'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'income-records'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own income record files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'income-records'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

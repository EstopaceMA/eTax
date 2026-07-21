alter table public.income_record_uploads
add column if not exists total_income numeric(14, 2);

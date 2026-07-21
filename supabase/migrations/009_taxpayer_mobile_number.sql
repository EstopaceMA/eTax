alter table public.taxpayer_profiles
add column if not exists mobile_number text;

update public.taxpayer_profiles
set mobile_number = '09064902734'
where mobile_number is null;

update public.taxpayer_profiles
set
  tin_status = '123-456-789-000',
  rdo = 'RDO 043A - East Pasig'
where tin_status in ('TIN available', 'TIN on record')
   or rdo in ('RDO on record', 'RDO on file');

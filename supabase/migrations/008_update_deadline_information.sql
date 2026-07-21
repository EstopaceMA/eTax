update public.deadlines
set
  title = '2nd Quarter Form 1701Q',
  description = 'Upload income record images, confirm total income, and review the generated Form 1701Q preview.',
  due_date = '2026-08-15',
  status = 'due_soon',
  channel = 'Filing tracker · BIR Form',
  updated_at = now()
where title in ('Quarterly income tax preparation', '2nd Quarter Form 1701Q')
   or due_date = '2026-08-15';

update public.deadlines
set
  title = '3rd Quarter Form 1701Q',
  description = 'Prepare the next quarter''s income records before opening the Form 1701Q preview.',
  due_date = '2026-11-15',
  status = 'upcoming',
  channel = 'Filing tracker · Documents',
  updated_at = now()
where title in ('Monthly percentage tax review', '3rd Quarter Form 1701Q')
   or due_date = '2026-08-20';

update public.deadlines
set
  title = 'Annual Form 1701A',
  description = 'Review annual income records and confirm profile details before generating Form 1701A.',
  due_date = '2027-04-15',
  status = 'upcoming',
  channel = 'Filing tracker · Annual filing',
  updated_at = now()
where title in ('Registration record check', 'Annual Form 1701A')
   or due_date = '2026-09-05';

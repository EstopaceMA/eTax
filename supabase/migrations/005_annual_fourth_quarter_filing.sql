update public.filing_obligations
set
  form_name = 'Annual income tax return',
  period = 'Annual 2026',
  due_date = '2027-04-15',
  updated_at = now()
where form_name = 'Quarterly income tax return'
  and period = 'Q4 2026';

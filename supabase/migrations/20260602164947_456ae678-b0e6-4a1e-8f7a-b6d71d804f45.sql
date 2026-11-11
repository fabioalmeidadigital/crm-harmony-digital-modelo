
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS form_incomodo text,
  ADD COLUMN IF NOT EXISTS form_tempo text,
  ADD COLUMN IF NOT EXISTS form_motivacao text;

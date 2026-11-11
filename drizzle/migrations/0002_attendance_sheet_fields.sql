ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS attendance_status text,
  ADD COLUMN IF NOT EXISTS first_contact_date date,
  ADD COLUMN IF NOT EXISTS scheduled_info text,
  ADD COLUMN IF NOT EXISTS antecipar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral text,
  ADD COLUMN IF NOT EXISTS modality text,
  ADD COLUMN IF NOT EXISTS reservation_fee numeric,
  ADD COLUMN IF NOT EXISTS consult_value numeric,
  ADD COLUMN IF NOT EXISTS insurance text,
  ADD COLUMN IF NOT EXISTS observation text,
  ADD COLUMN IF NOT EXISTS temperature text,
  ADD COLUMN IF NOT EXISTS contact_1 date,
  ADD COLUMN IF NOT EXISTS contact_2 date,
  ADD COLUMN IF NOT EXISTS contact_3 date,
  ADD COLUMN IF NOT EXISTS contact_4 date,
  ADD COLUMN IF NOT EXISTS attendant text,
  ADD COLUMN IF NOT EXISTS sheet_imported boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_leads_attendance_status ON public.leads(attendance_status);
CREATE INDEX IF NOT EXISTS idx_leads_first_contact_date ON public.leads(first_contact_date);
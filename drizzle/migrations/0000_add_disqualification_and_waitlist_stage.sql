ALTER TYPE pipeline_stage ADD VALUE IF NOT EXISTS 'lista_espera';

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS disqualification_reason text,
  ADD COLUMN IF NOT EXISTS disqualified_at timestamptz;

COMMENT ON COLUMN public.leads.disqualification_reason IS 'Motivo de desqualificacao do lead (lista pre-determinada)';
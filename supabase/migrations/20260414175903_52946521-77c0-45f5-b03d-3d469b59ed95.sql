
-- Add new stages for Pipe 2 (Sales Funnel)
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'plano_apresentado';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'aguardando_decisao';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'procedimento_fechado';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'cirurgia_agendada';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'cirurgia_realizada';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'pos_procedimento';

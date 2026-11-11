
-- Create enum for pipeline stages
CREATE TYPE public.pipeline_stage AS ENUM (
  'novo_lead', 'contato_feito', 'consulta_agendada', 
  'consulta_realizada', 'procedimento_agendado', 'realizado'
);

-- Lead sources table
CREATE TABLE public.lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Procedures table
CREATE TABLE public.procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  age INTEGER,
  city TEXT,
  source TEXT NOT NULL,
  procedure TEXT NOT NULL,
  stage pipeline_stage NOT NULL DEFAULT 'novo_lead',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_interaction TIMESTAMP WITH TIME ZONE
);

-- Lead notes table
CREATE TABLE public.lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies: all authenticated users can CRUD
CREATE POLICY "Authenticated users can view lead_sources" ON public.lead_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert lead_sources" ON public.lead_sources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update lead_sources" ON public.lead_sources FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete lead_sources" ON public.lead_sources FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view procedures" ON public.procedures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert procedures" ON public.procedures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update procedures" ON public.procedures FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete procedures" ON public.procedures FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete leads" ON public.leads FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view lead_notes" ON public.lead_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert lead_notes" ON public.lead_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update lead_notes" ON public.lead_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete lead_notes" ON public.lead_notes FOR DELETE TO authenticated USING (true);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for leads updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default lead sources
INSERT INTO public.lead_sources (name) VALUES
  ('Instagram Ads'), ('Google Ads'), ('Indicação'), ('Site'), ('Orgânico'), ('Evento'), ('Outro');

-- Seed default procedures
INSERT INTO public.procedures (name) VALUES
  ('Mamoplastia'), ('Abdominoplastia'), ('Rinoplastia'), ('Lipoaspiração'),
  ('Blefaroplastia'), ('Lifting Facial'), ('Prótese de Glúteo'), ('Otoplastia'), ('Outro');

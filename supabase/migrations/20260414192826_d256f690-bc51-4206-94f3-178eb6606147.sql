
-- Add next_step column to leads
ALTER TABLE public.leads ADD COLUMN next_step text;

-- Create table for possible next steps per pipeline stage
CREATE TABLE public.pipeline_next_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL,
  step_order integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.pipeline_next_steps ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can read pipeline_next_steps"
  ON public.pipeline_next_steps FOR SELECT TO authenticated
  USING (true);

-- Only mestre can manage
CREATE POLICY "Mestre can manage pipeline_next_steps"
  ON public.pipeline_next_steps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'mestre'))
  WITH CHECK (public.has_role(auth.uid(), 'mestre'));

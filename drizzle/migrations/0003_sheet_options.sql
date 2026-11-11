CREATE TABLE public.sheet_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  value text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheet_options TO authenticated;
GRANT ALL ON public.sheet_options TO service_role;
ALTER TABLE public.sheet_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sheet options" ON public.sheet_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sheet options" ON public.sheet_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'mestre') OR public.has_role(auth.uid(),'administrativo'))
  WITH CHECK (public.has_role(auth.uid(),'mestre') OR public.has_role(auth.uid(),'administrativo'));
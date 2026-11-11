
-- Create storage bucket for lead attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-attachments', 'lead-attachments', false);

-- Storage policies: authenticated users can manage files
CREATE POLICY "Auth users can upload lead attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lead-attachments');

CREATE POLICY "Auth users can view lead attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lead-attachments');

CREATE POLICY "Auth users can delete lead attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lead-attachments');

-- Create table to track attachments metadata
CREATE TABLE public.lead_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  category TEXT NOT NULL DEFAULT 'outro',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view lead attachments"
ON public.lead_attachments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Auth users can insert lead attachments"
ON public.lead_attachments FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Auth users can delete lead attachments"
ON public.lead_attachments FOR DELETE TO authenticated
USING (true);

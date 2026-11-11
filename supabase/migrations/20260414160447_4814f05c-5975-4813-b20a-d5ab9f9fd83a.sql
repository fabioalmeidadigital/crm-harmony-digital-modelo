
-- Add Google Calendar event ID to appointments
ALTER TABLE public.appointments ADD COLUMN google_calendar_event_id text UNIQUE DEFAULT NULL;

-- Create integration settings table
CREATE TABLE public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view settings" ON public.integration_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert settings" ON public.integration_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update settings" ON public.integration_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete settings" ON public.integration_settings FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON public.integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

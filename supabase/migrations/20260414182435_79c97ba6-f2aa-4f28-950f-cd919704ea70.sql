
-- Function to auto-create appointment when lead moves to consulta_agendada
CREATE OR REPLACE FUNCTION public.auto_create_appointment_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when stage changes to consulta_agendada
  IF NEW.stage = 'consulta_agendada' AND (OLD.stage IS NULL OR OLD.stage != 'consulta_agendada') THEN
    -- Check if there's already a pending/confirmed appointment for this lead
    IF NOT EXISTS (
      SELECT 1 FROM public.appointments 
      WHERE lead_id = NEW.id 
      AND status IN ('pendente', 'confirmado')
    ) THEN
      INSERT INTO public.appointments (lead_id, procedure_name, scheduled_at, status, notes)
      VALUES (
        NEW.id,
        NEW.procedure,
        (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours'),
        'pendente',
        'Agendamento criado automaticamente ao mover para Consulta Agendada. Ajuste a data/horário.'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to leads table
CREATE TRIGGER trg_auto_appointment_on_consulta_agendada
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_appointment_on_stage_change();

-- Also handle INSERT (new lead already in consulta_agendada)
CREATE TRIGGER trg_auto_appointment_on_insert_consulta
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_appointment_on_stage_change();

-- Anon access for appointments (temporary, no auth yet)
CREATE POLICY "Anon users can insert appointments" ON public.appointments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update appointments" ON public.appointments FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon users can delete appointments" ON public.appointments FOR DELETE TO anon USING (true);

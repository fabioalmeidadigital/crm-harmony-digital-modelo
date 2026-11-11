
-- Leads: allow anon full access (temporary until auth is implemented)
CREATE POLICY "Anon users can view leads" ON public.leads FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert leads" ON public.leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update leads" ON public.leads FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon users can delete leads" ON public.leads FOR DELETE TO anon USING (true);

-- Lead notes
CREATE POLICY "Anon users can view lead_notes" ON public.lead_notes FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert lead_notes" ON public.lead_notes FOR INSERT TO anon WITH CHECK (true);

-- Fornecedores
CREATE POLICY "Anon users can view fornecedores" ON public.fornecedores FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert fornecedores" ON public.fornecedores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update fornecedores" ON public.fornecedores FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon users can delete fornecedores" ON public.fornecedores FOR DELETE TO anon USING (true);

-- Appointments
CREATE POLICY "Anon users can view appointments" ON public.appointments FOR SELECT TO anon USING (true);

-- Lead sources & procedures (for admin forms)
CREATE POLICY "Anon users can view lead_sources" ON public.lead_sources FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert lead_sources" ON public.lead_sources FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update lead_sources" ON public.lead_sources FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon users can delete lead_sources" ON public.lead_sources FOR DELETE TO anon USING (true);

CREATE POLICY "Anon users can view procedures" ON public.procedures FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert procedures" ON public.procedures FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update procedures" ON public.procedures FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon users can delete procedures" ON public.procedures FOR DELETE TO anon USING (true);

-- Lead attachments
CREATE POLICY "Anon users can view lead_attachments" ON public.lead_attachments FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert lead_attachments" ON public.lead_attachments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can delete lead_attachments" ON public.lead_attachments FOR DELETE TO anon USING (true);

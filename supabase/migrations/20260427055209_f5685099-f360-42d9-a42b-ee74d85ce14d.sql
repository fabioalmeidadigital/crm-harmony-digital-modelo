
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS labels text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_conv_last_msg ON public.chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_whatsapp ON public.chat_conversations(whatsapp_number);

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound',
  ADD COLUMN IF NOT EXISTS whatsapp_message_id text,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS sender_name text;

CREATE INDEX IF NOT EXISTS idx_msg_conv_created ON public.chat_messages(conversation_id, created_at);

DROP POLICY IF EXISTS "Auth users can update messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Auth users can delete messages" ON public.chat_messages;
CREATE POLICY "Auth users can update messages" ON public.chat_messages
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.conversation_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#FF6D6A',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversation_labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users view labels" ON public.conversation_labels;
DROP POLICY IF EXISTS "Auth users insert labels" ON public.conversation_labels;
DROP POLICY IF EXISTS "Auth users update labels" ON public.conversation_labels;
DROP POLICY IF EXISTS "Auth users delete labels" ON public.conversation_labels;
CREATE POLICY "Auth users view labels" ON public.conversation_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users insert labels" ON public.conversation_labels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users update labels" ON public.conversation_labels FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users delete labels" ON public.conversation_labels FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mega_api',
  instance_key text NOT NULL,
  phone_number text,
  status text NOT NULL DEFAULT 'disconnected',
  qr_code text,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users view instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Admins manage instances" ON public.whatsapp_instances;
CREATE POLICY "Auth users view instances" ON public.whatsapp_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage instances" ON public.whatsapp_instances FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'mestre'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'mestre'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role));

DROP TRIGGER IF EXISTS update_whatsapp_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.conversation_labels (name, color) VALUES
  ('Urgente', '#EF4444'),
  ('Orçamento', '#F59E0B'),
  ('Pós-venda', '#10B981'),
  ('Dúvida', '#3B82F6')
ON CONFLICT (name) DO NOTHING;

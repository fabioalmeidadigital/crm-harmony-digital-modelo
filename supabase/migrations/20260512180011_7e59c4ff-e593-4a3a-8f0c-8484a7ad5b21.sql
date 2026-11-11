
-- Multi-instância WhatsApp: nome amigável + sufixo de secrets + vínculo da conversa
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Principal',
  ADD COLUMN IF NOT EXISTS secret_suffix text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_secret_suffix_unique
  ON public.whatsapp_instances(secret_suffix);

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS whatsapp_instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS chat_conversations_whatsapp_instance_id_idx
  ON public.chat_conversations(whatsapp_instance_id);

-- Atualiza instância existente como "Principal" (sufixo vazio = MEGA_API_*)
UPDATE public.whatsapp_instances
   SET name = 'Principal', secret_suffix = ''
 WHERE secret_suffix = '' AND name IN ('Principal','');

-- Garante linha para a segunda instância (sufixo "_2" → MEGA_API_*_2)
INSERT INTO public.whatsapp_instances (provider, instance_key, status, name, secret_suffix)
SELECT 'mega_api', 'pending', 'disconnected', 'Secundária', '_2'
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_instances WHERE secret_suffix = '_2');

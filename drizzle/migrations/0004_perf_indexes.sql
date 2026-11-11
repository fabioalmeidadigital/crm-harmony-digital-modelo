CREATE INDEX IF NOT EXISTS idx_msg_whatsapp_message_id ON public.chat_messages (whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_msg_created_at ON public.chat_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
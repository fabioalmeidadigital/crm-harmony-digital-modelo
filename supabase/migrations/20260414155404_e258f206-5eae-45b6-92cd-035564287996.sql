
-- Tabela de disponibilidade da doutora
CREATE TABLE public.doctor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view availability" ON public.doctor_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert availability" ON public.doctor_availability FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update availability" ON public.doctor_availability FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete availability" ON public.doctor_availability FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_doctor_availability_updated_at BEFORE UPDATE ON public.doctor_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de agentes de IA
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  system_prompt TEXT,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view agents" ON public.ai_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert agents" ON public.ai_agents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update agents" ON public.ai_agents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete agents" ON public.ai_agents FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de conversas
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'active',
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view conversations" ON public.chat_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert conversations" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update conversations" ON public.chat_conversations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete conversations" ON public.chat_conversations FOR DELETE TO authenticated USING (true);

-- Allow anonymous users to insert conversations (for website chat widget)
CREATE POLICY "Anon users can insert conversations" ON public.chat_conversations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can view own conversations" ON public.chat_conversations FOR SELECT TO anon USING (true);

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de mensagens
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view messages" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon users can insert messages" ON public.chat_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can view messages" ON public.chat_messages FOR SELECT TO anon USING (true);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;

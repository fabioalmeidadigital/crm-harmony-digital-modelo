
-- 1. stage rank function for picking most-advanced stage during merge
CREATE OR REPLACE FUNCTION public.stage_rank(s pipeline_stage)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE s::text
    WHEN 'novo_lead' THEN 1
    WHEN 'contato_feito' THEN 2
    WHEN 'consulta_agendada' THEN 3
    WHEN 'consulta_realizada' THEN 4
    WHEN 'plano_apresentado' THEN 5
    WHEN 'aguardando_decisao' THEN 6
    WHEN 'procedimento_agendado' THEN 7
    WHEN 'procedimento_fechado' THEN 8
    WHEN 'cirurgia_agendada' THEN 9
    WHEN 'cirurgia_realizada' THEN 10
    WHEN 'realizado' THEN 11
    WHEN 'pos_procedimento' THEN 12
    WHEN 'fornecedor' THEN 0
    WHEN 'nao_fechou' THEN 0
    ELSE 0
  END
$$;

-- 2. Dedupe leads by last-10-digits phone
DO $$
DECLARE
  grp RECORD;
  canonical_id uuid;
  best_stage pipeline_stage;
BEGIN
  FOR grp IN
    SELECT right(regexp_replace(coalesce(phone,''),'\D','','g'),10) AS p10,
           array_agg(id ORDER BY created_at) AS ids
    FROM public.leads
    WHERE coalesce(phone,'') <> ''
    GROUP BY 1
    HAVING COUNT(*) > 1 AND right(regexp_replace(coalesce(max(phone),''),'\D','','g'),10) <> ''
  LOOP
    canonical_id := grp.ids[1];

    SELECT stage INTO best_stage
    FROM public.leads
    WHERE id = ANY(grp.ids)
    ORDER BY public.stage_rank(stage) DESC, created_at ASC
    LIMIT 1;

    -- repoint child rows to canonical
    UPDATE public.chat_conversations SET lead_id = canonical_id WHERE lead_id = ANY(grp.ids) AND lead_id <> canonical_id;
    UPDATE public.lead_notes         SET lead_id = canonical_id WHERE lead_id = ANY(grp.ids) AND lead_id <> canonical_id;
    UPDATE public.lead_attachments   SET lead_id = canonical_id WHERE lead_id = ANY(grp.ids) AND lead_id <> canonical_id;
    UPDATE public.appointments       SET lead_id = canonical_id WHERE lead_id = ANY(grp.ids) AND lead_id <> canonical_id;

    -- delete duplicate leads
    DELETE FROM public.leads WHERE id = ANY(grp.ids) AND id <> canonical_id;

    -- set best stage on canonical
    UPDATE public.leads SET stage = best_stage WHERE id = canonical_id;
  END LOOP;
END $$;

-- 3. Merge duplicate conversations per (whatsapp_number, channel='whatsapp')
DO $$
DECLARE
  grp RECORD;
  canonical_conv uuid;
  dup_ids uuid[];
  total_unread int;
  latest_at timestamptz;
  latest_preview text;
BEGIN
  FOR grp IN
    SELECT whatsapp_number, array_agg(id ORDER BY created_at) AS ids
    FROM public.chat_conversations
    WHERE channel = 'whatsapp' AND coalesce(whatsapp_number,'') <> ''
    GROUP BY whatsapp_number
    HAVING COUNT(*) > 1
  LOOP
    canonical_conv := grp.ids[1];
    dup_ids := grp.ids[2:array_length(grp.ids,1)];

    UPDATE public.chat_messages SET conversation_id = canonical_conv WHERE conversation_id = ANY(dup_ids);

    SELECT COALESCE(SUM(unread_count),0),
           MAX(last_message_at),
           (array_agg(last_message_preview ORDER BY last_message_at DESC NULLS LAST))[1]
    INTO total_unread, latest_at, latest_preview
    FROM public.chat_conversations WHERE id = ANY(grp.ids);

    UPDATE public.chat_conversations
    SET unread_count = total_unread,
        last_message_at = latest_at,
        last_message_preview = COALESCE(latest_preview, last_message_preview)
    WHERE id = canonical_conv;

    DELETE FROM public.chat_conversations WHERE id = ANY(dup_ids);
  END LOOP;
END $$;

-- 4. Add normalized phone column + unique index on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone_normalized text
  GENERATED ALWAYS AS (right(regexp_replace(coalesce(phone,''),'\D','','g'),10)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_normalized_key
  ON public.leads(phone_normalized)
  WHERE phone_normalized <> '';

-- 5. Add normalized phone + unique index on chat_conversations (per channel)
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS phone_normalized text
  GENERATED ALWAYS AS (right(regexp_replace(coalesce(whatsapp_number,''),'\D','','g'),10)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_phone_channel_key
  ON public.chat_conversations(phone_normalized, channel)
  WHERE phone_normalized <> '';

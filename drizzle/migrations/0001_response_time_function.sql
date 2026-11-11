CREATE OR REPLACE FUNCTION public.get_response_pairs(p_days integer DEFAULT 90)
RETURNS TABLE (
  conversation_id uuid,
  contact_name text,
  inbound_at timestamptz,
  replied_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH m AS (
    SELECT cm.conversation_id,
           cm.direction,
           cm.created_at,
           LAG(cm.direction) OVER (PARTITION BY cm.conversation_id ORDER BY cm.created_at) AS prev_direction
    FROM public.chat_messages cm
    WHERE cm.created_at >= now() - (p_days || ' days')::interval
  )
  SELECT m.conversation_id,
         c.contact_name,
         m.created_at AS inbound_at,
         (SELECT MIN(o.created_at)
            FROM public.chat_messages o
           WHERE o.conversation_id = m.conversation_id
             AND o.direction = 'outbound'
             AND o.created_at > m.created_at) AS replied_at
  FROM m
  LEFT JOIN public.chat_conversations c ON c.id = m.conversation_id
  WHERE m.direction = 'inbound'
    AND (m.prev_direction IS NULL OR m.prev_direction = 'outbound')
  ORDER BY m.created_at DESC
  LIMIT 5000;
$$;

GRANT EXECUTE ON FUNCTION public.get_response_pairs(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_response_pairs(integer) TO service_role;
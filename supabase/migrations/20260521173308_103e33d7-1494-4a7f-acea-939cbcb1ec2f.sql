
CREATE OR REPLACE FUNCTION public.format_lead_name(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  word text;
  result text := '';
  parts text[];
  lower_particles text[] := ARRAY['de','da','do','das','dos','e','di','du','del','della','van','von'];
  i int := 0;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  parts := regexp_split_to_array(btrim(regexp_replace(input, '\s+', ' ', 'g')), ' ');
  FOREACH word IN ARRAY parts LOOP
    i := i + 1;
    IF word = '' THEN CONTINUE; END IF;
    IF i > 1 AND lower(word) = ANY(lower_particles) THEN
      result := result || ' ' || lower(word);
    ELSE
      result := result || CASE WHEN result = '' THEN '' ELSE ' ' END
        || upper(substring(word from 1 for 1)) || lower(substring(word from 2));
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_format_lead_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := public.format_lead_name(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_format_name ON public.leads;
CREATE TRIGGER leads_format_name
BEFORE INSERT OR UPDATE OF name ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.trg_format_lead_name();

CREATE OR REPLACE FUNCTION public.trg_format_conversation_contact_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.contact_name IS NOT NULL THEN
    NEW.contact_name := public.format_lead_name(NEW.contact_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_conversations_format_contact_name ON public.chat_conversations;
CREATE TRIGGER chat_conversations_format_contact_name
BEFORE INSERT OR UPDATE OF contact_name ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.trg_format_conversation_contact_name();

UPDATE public.leads SET name = public.format_lead_name(name)
WHERE name IS NOT NULL AND name <> public.format_lead_name(name);

UPDATE public.chat_conversations SET contact_name = public.format_lead_name(contact_name)
WHERE contact_name IS NOT NULL AND contact_name <> public.format_lead_name(contact_name);

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConversationLabel {
  id: string;
  name: string;
  color: string;
}

export function useLabels() {
  const [labels, setLabels] = useState<ConversationLabel[]>([]);

  const load = async () => {
    const { data } = await supabase.from("conversation_labels").select("*").order("name");
    setLabels((data as ConversationLabel[]) || []);
  };

  useEffect(() => { load(); }, []);

  const create = async (name: string, color: string) => {
    await supabase.from("conversation_labels").insert({ name, color });
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("conversation_labels").delete().eq("id", id);
    load();
  };

  return { labels, create, remove, reload: load };
}

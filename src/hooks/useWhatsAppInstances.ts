import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppInstance {
  id: string;
  name: string;
  secret_suffix: string;
  instance_key: string;
  phone_number: string | null;
  status: string;
  qr_code: string | null;
  is_active: boolean;
  created_at: string;
}

export function useWhatsAppInstances() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .order("created_at", { ascending: true });
    setInstances((data as WhatsAppInstance[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`whatsapp-instances-changes-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_instances" }, (payload: any) => {
        if (payload.eventType === "UPDATE" && payload.new?.id) {
          const row = payload.new as WhatsAppInstance;
          setInstances(prev => {
            const i = prev.findIndex(x => x.id === row.id);
            if (i === -1) return prev;
            const cur = prev[i];
            // Ignora mudanças que não afetam a tela (ex.: só last_sync_at)
            if (cur.status === row.status && cur.phone_number === row.phone_number &&
                cur.qr_code === row.qr_code && cur.name === row.name && cur.is_active === row.is_active) return prev;
            const next = prev.slice();
            next[i] = { ...cur, ...row };
            return next;
          });
        } else {
          load();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { instances, loading, reload: load };
}

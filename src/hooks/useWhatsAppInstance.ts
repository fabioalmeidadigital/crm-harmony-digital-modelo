import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWhatsAppInstance() {
  const [loading, setLoading] = useState(false);

  const call = async (action: "status" | "qrcode" | "disconnect", instance_id?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-instance", { body: { action, instance_id } });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getStatus: (instance_id?: string) => call("status", instance_id),
    getQrCode: (instance_id?: string) => call("qrcode", instance_id),
    disconnect: (instance_id?: string) => call("disconnect", instance_id),
  };
}

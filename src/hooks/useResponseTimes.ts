import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { businessMinutesBetween, isBusinessTime, localHour } from "@/lib/businessHours";

export interface ResponsePair {
  conversation_id: string;
  contact_name: string | null;
  inbound_at: string;
  replied_at: string | null;
  businessMinutes: number | null;
  rawMinutes: number | null;
  duringBusinessHours: boolean;
  hour: number;
}

export function useResponseTimes(days = 30) {
  return useQuery({
    queryKey: ["response-times", days],
    queryFn: async (): Promise<ResponsePair[]> => {
      const { data, error } = await supabase.rpc("get_response_pairs", { p_days: days });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        conversation_id: r.conversation_id,
        contact_name: r.contact_name,
        inbound_at: r.inbound_at,
        replied_at: r.replied_at,
        businessMinutes: r.replied_at ? businessMinutesBetween(r.inbound_at, r.replied_at) : null,
        rawMinutes: r.replied_at
          ? (new Date(r.replied_at).getTime() - new Date(r.inbound_at).getTime()) / 60000
          : null,
        duringBusinessHours: isBusinessTime(r.inbound_at),
        hour: localHour(r.inbound_at),
      }));
    },
  });
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

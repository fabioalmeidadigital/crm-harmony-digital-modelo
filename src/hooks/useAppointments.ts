import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppointmentWithLead = {
  id: string;
  lead_id: string;
  procedure_name: string;
  scheduled_at: string;
  status: "pendente" | "confirmado" | "cancelado" | "realizado";
  notes: string | null;
  reminder_48h_sent: boolean;
  reminder_24h_sent: boolean;
  google_calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
  leads: { name: string; phone: string; email: string | null } | null;
};

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, leads(name, phone, email)")
        .eq("status", "confirmado")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as AppointmentWithLead[];
    },
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      lead_id: string;
      procedure_name: string;
      scheduled_at: string;
      status?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from("appointments").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; notes?: string; reminder_48h_sent?: boolean; reminder_24h_sent?: boolean }) => {
      const { error } = await supabase.from("appointments").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

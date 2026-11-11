import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DoctorAvailability = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const getDayName = (day: number) => DAY_NAMES[day] || "Desconhecido";

export function useDoctorAvailability() {
  return useQuery({
    queryKey: ["doctor_availability"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctor_availability").select("*").order("day_of_week").order("start_time");
      if (error) throw error;
      return data as DoctorAvailability[];
    },
  });
}

export function useCreateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slot: { day_of_week: number; start_time: string; end_time: string }) => {
      const { error } = await supabase.from("doctor_availability").insert(slot as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor_availability"] }),
  });
}

export function useUpdateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; is_active?: boolean; start_time?: string; end_time?: string }) => {
      const { error } = await supabase.from("doctor_availability").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor_availability"] }),
  });
}

export function useDeleteAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doctor_availability").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor_availability"] }),
  });
}

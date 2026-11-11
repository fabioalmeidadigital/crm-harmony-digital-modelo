import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SHEET_SOURCES, INSURANCES, MODALITIES, TEMPERATURES, CONTACT_REASONS } from "@/lib/attendance";

export const OPTION_CATEGORIES = [
  { id: "source", label: "Origem", fallback: SHEET_SOURCES },
  { id: "insurance", label: "Particular/Convênio", fallback: INSURANCES },
  { id: "procedure", label: "Motivo do contato", fallback: CONTACT_REASONS },
  { id: "modality", label: "Online/Presencial", fallback: MODALITIES },
  { id: "temperature", label: "Temperatura", fallback: TEMPERATURES },
  { id: "attendant", label: "Responsável", fallback: [] as string[] },
] as const;

export type SheetOptions = Record<string, string[]>;

export function useSheetOptions() {
  const { data } = useQuery({
    queryKey: ["sheet-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sheet_options").select("*").order("sort_order").order("value");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
  const out: SheetOptions = {};
  OPTION_CATEGORIES.forEach(c => {
    const list = (data || []).filter(o => o.category === c.id).map(o => o.value);
    out[c.id] = list.length ? list : [...c.fallback];
  });
  return out;
}

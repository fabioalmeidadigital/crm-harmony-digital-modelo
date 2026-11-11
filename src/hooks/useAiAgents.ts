import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AiAgent = {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  model: string;
  system_prompt: string | null;
  capabilities: string[];
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function useAiAgents() {
  return useQuery({
    queryKey: ["ai_agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_agents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as AiAgent[];
    },
  });
}

export function useCreateAiAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agent: { name: string; description?: string; provider?: string; model?: string; system_prompt?: string; capabilities?: string[]; config?: Record<string, unknown> }) => {
      const { error } = await supabase.from("ai_agents").insert(agent as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_agents"] }),
  });
}

export function useUpdateAiAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<AiAgent>) => {
      const { error } = await supabase.from("ai_agents").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_agents"] }),
  });
}

export function useDeleteAiAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_agents"] }),
  });
}

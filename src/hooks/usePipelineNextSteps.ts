import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PipelineNextStep } from "@/lib/types";

export function usePipelineNextSteps(stage?: string) {
  const [steps, setSteps] = useState<PipelineNextStep[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stage) return;
    setLoading(true);
    supabase
      .from("pipeline_next_steps")
      .select("*")
      .eq("stage", stage)
      .order("step_order")
      .then(({ data }) => {
        setSteps((data || []) as PipelineNextStep[]);
        setLoading(false);
      });
  }, [stage]);

  return { steps, loading };
}

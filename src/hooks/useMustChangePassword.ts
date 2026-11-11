import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useMustChangePassword() {
  const { user } = useAuth();
  const [mustChange, setMustChange] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setMustChange(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("user_id", user.id)
      .maybeSingle();
    setMustChange(Boolean(data?.must_change_password));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { mustChange, loading, refresh, clear: () => setMustChange(false) };
}

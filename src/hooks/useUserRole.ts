import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "mestre" | "administrativo" | "comercial" | null;

// Module-level cache so every consumer shares the same resolved role and a
// transient network/token error never flips the UI to "Acesso Pendente".
const roleCache = new Map<string, Exclude<AppRole, null>>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchRoleWithRetry(userId: string): Promise<{ role: AppRole; failed: boolean }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error) {
      return { role: (data?.role as AppRole) ?? null, failed: false };
    }

    console.error("Error fetching role (attempt " + (attempt + 1) + "):", error);
    await sleep(500 * (attempt + 1));
  }
  return { role: null, failed: true };
}

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>(user ? roleCache.get(user.id) ?? null : null);
  const [loading, setLoading] = useState(() => !(user && roleCache.has(user.id)));

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const cached = roleCache.get(user.id) ?? null;
    if (cached) {
      setRole(cached);
      setLoading(false);
    }

    let active = true;
    (async () => {
      const { role: fetched, failed } = await fetchRoleWithRetry(user.id);
      if (!active) return;

      if (failed) {
        // Keep whatever we had (cached role) instead of locking the user out.
        setLoading(false);
        return;
      }

      if (fetched) {
        roleCache.set(user.id, fetched);
      } else {
        roleCache.delete(user.id);
      }
      setRole(fetched);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const isMestre = role === "mestre";
  const isAdmin = role === "administrativo" || role === "mestre";
  const isComercial = role === "comercial";

  return { role, loading, isMestre, isAdmin, isComercial };
}

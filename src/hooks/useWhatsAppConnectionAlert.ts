import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";

const CHECK_INTERVAL_MS = 120000; // 2 minutos
const SNOOZE_MS = 15 * 60 * 1000; // 15 minutos
const SNOOZE_KEY = "wa-conn-alert-snooze-until";

export interface InstanceConnState {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  configured: boolean;
  connected: boolean;
}

const CONNECTED = new Set(["connected", "open", "authenticated"]);

export function useWhatsAppConnectionAlert() {
  const { instances } = useWhatsAppInstances();
  const [states, setStates] = useState<InstanceConnState[]>([]);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const snoozedUntil = useRef<number>(Number(localStorage.getItem(SNOOZE_KEY) || 0));

  // Ref evita ciclo infinito: check grava status → realtime → novas instances → check de novo.
  const instancesRef = useRef(instances);
  instancesRef.current = instances;
  const idsKey = instances.map((i) => i.id).join(",");
  const running = useRef(false);

  const check = useCallback(async () => {
    const list = instancesRef.current;
    if (list.length === 0 || running.current) return;
    running.current = true;
    setChecking(true);
    try {
      const results = await Promise.all(
        list.map(async (inst) => {
          try {
            const { data } = await supabase.functions.invoke("whatsapp-instance", {
              body: { action: "status", instance_id: inst.id },
            });
            const status = data?.status || "unknown";
            return {
              id: inst.id,
              name: inst.name,
              phone: data?.phone || inst.phone_number || null,
              status,
              configured: data?.configured !== false,
              connected: CONNECTED.has(status),
            } as InstanceConnState;
          } catch {
            return {
              id: inst.id,
              name: inst.name,
              phone: inst.phone_number,
              status: "erro_consulta",
              configured: true,
              connected: false,
            } as InstanceConnState;
          }
        })
      );
      setStates(results);
      const hasProblem = results.some((r) => !r.connected);
      if (hasProblem && Date.now() > snoozedUntil.current) setOpen(true);
      if (!hasProblem) setOpen(false);
    } finally {
      running.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!idsKey) return;
    check();
    const i = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(i);
  }, [idsKey, check]);

  const snooze = useCallback(() => {
    const until = Date.now() + SNOOZE_MS;
    snoozedUntil.current = until;
    localStorage.setItem(SNOOZE_KEY, String(until));
    setOpen(false);
  }, []);

  const disconnected = states.filter((s) => !s.connected);

  return { states, disconnected, open, setOpen, snooze, recheck: check, checking };
}

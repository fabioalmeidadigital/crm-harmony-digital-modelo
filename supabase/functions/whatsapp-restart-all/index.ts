// Reinicia todas as instâncias WhatsApp (Mega API) — chamado via cron a cada 20min
// Resolve o problema documentado pelo suporte Mega API onde a sessão do aparelho
// trava e para de disparar webhooks até ser reiniciada.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeHost(host?: string | null) {
  if (!host) return null;
  const trimmed = host.trim().replace(/\/$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: instances } = await supabase
    .from("whatsapp_instances")
    .select("*")
    .eq("is_active", true);

  const results: any[] = [];

  for (const inst of instances || []) {
    const suffix = inst.secret_suffix || "";
    const host = normalizeHost(Deno.env.get(`MEGA_API_HOST${suffix}`));
    const apiToken = Deno.env.get(`MEGA_API_TOKEN${suffix}`);
    const instanceKey = Deno.env.get(`MEGA_API_INSTANCE_KEY${suffix}`) || inst.instance_key;

    if (!host || !apiToken || !instanceKey) {
      results.push({ instance: inst.name, ok: false, error: "credentials missing" });
      continue;
    }

    try {
      const url = `${host}/rest/instance/${instanceKey}/restart`;
      const r = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      });
      const out = await r.json().catch(() => ({}));
      const apiOk = r.ok && out?.error !== true;
      console.log(`[restart-all] ${inst.name}:`, r.status, JSON.stringify(out).slice(0, 200));
      results.push({ instance: inst.name, ok: apiOk, status: r.status, response: out });

      // Se a API respondeu "Instance not found", marca a instância como desconectada
      // para refletir o estado real no painel (o cron antes só atualizava last_sync_at).
      const notFound = out?.name === "NOT_FOUND" || out?.statusCode === 404;
      await supabase
        .from("whatsapp_instances")
        .update({
          last_sync_at: new Date().toISOString(),
          ...(notFound ? { status: "not_found" } : {}),
        })
        .eq("id", inst.id);

      await supabase
        .from("whatsapp_instances")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", inst.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      console.error(`[restart-all] ${inst.name}:`, msg);
      results.push({ instance: inst.name, ok: false, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, restarted: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

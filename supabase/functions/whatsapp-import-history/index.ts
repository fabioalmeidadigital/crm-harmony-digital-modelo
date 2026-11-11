// Sincroniza a agenda de contatos do WhatsApp (Mega API) com o CRM.
// Não cria leads: apenas completa nomes de leads/conversas que estão com
// placeholder ("WhatsApp 1234") ou vazios.
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

function normalizePhone(input: string): string {
  return (input || "").replace(/@.*$/, "").replace(/\D/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: claims, error: cErr } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, serviceKey);
  const body = await req.json().catch(() => ({} as any));
  const dryRun = body.dry_run === true;

  try {
    const { data: instances } = await supabase
      .from("whatsapp_instances").select("*").order("created_at", { ascending: true });
    if (!instances?.length) return json({ ok: false, error: "Nenhuma instância configurada" }, 400);

    // phone (10 últimos dígitos) -> nome
    const nameByPhone = new Map<string, string>();
    const perInstance: any[] = [];

    for (const inst of instances) {
      const suffix = inst.secret_suffix ?? "";
      const host = normalizeHost(Deno.env.get(`MEGA_API_HOST${suffix}`));
      const token = Deno.env.get(`MEGA_API_TOKEN${suffix}`);
      const key = Deno.env.get(`MEGA_API_INSTANCE_KEY${suffix}`);
      if (!host || !token || !key) {
        perInstance.push({ instance: inst.name, error: "credenciais ausentes" });
        continue;
      }
      const r = await fetch(`${host}/rest/instance/contacts/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const out = await r.json().catch(() => ({}));
      const contacts: any[] = Array.isArray(out?.contacts) ? out.contacts : [];
      for (const c of contacts) {
        const phone = normalizePhone(c?.phoneNumber || c?.id || "");
        const name = typeof c?.name === "string" ? c.name.trim() : "";
        if (phone.length < 10 || phone.length > 13 || !name) continue;
        if (!/\p{L}{2}/u.test(name)) continue; // ignora nomes que são só números
        const last10 = phone.slice(-10);
        if (!nameByPhone.has(last10)) nameByPhone.set(last10, name);
      }
      perInstance.push({ instance: inst.name, contacts: contacts.length });
    }

    // Leads sem nome real
    const { data: leads } = await supabase
      .from("leads").select("id, name, phone_normalized")
      .or("name.is.null,name.ilike.WhatsApp %,name.ilike.Whatsapp %");

    let leadsUpdated = 0;
    const preview: any[] = [];
    for (const l of leads || []) {
      const n = l.phone_normalized ? nameByPhone.get(l.phone_normalized) : undefined;
      if (!n) continue;
      preview.push({ from: l.name, to: n });
      if (!dryRun) {
        const { error } = await supabase.from("leads").update({ name: n }).eq("id", l.id);
        if (!error) leadsUpdated++;
      }
    }

    // Conversas sem nome de contato
    const { data: convs } = await supabase
      .from("chat_conversations").select("id, contact_name, phone_normalized")
      .is("contact_name", null);

    let convsUpdated = 0;
    for (const c of convs || []) {
      const n = c.phone_normalized ? nameByPhone.get(c.phone_normalized) : undefined;
      if (!n) continue;
      if (!dryRun) {
        const { error } = await supabase.from("chat_conversations").update({ contact_name: n }).eq("id", c.id);
        if (!error) convsUpdated++;
      }
    }

    return json({
      ok: true,
      dry_run: dryRun,
      instances: perInstance,
      contacts_indexed: nameByPhone.size,
      leads_matched: preview.length,
      leads_updated: leadsUpdated,
      conversations_updated: convsUpdated,
      sample: preview.slice(0, 20),
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "erro" }, 500);
  }
});

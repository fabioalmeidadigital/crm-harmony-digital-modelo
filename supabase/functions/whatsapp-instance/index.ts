// Gerencia conexão com Mega API: status, QR Code, conectar, desconectar
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

  let requestBody: Record<string, unknown> = req.method === "GET"
    ? { action: "status" }
    : await req.json().catch(() => ({ action: "status" }));
  const publicActions = new Set<string>();
  const action = typeof requestBody.action === "string" ? requestBody.action : "status";
  const instanceId = typeof requestBody.instance_id === "string" ? requestBody.instance_id : null;

  const authHeader = req.headers.get("Authorization");
  if (!publicActions.has(action) && !authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!publicActions.has(action)) {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader!.replace("Bearer ", "");
    const { data: claims, error: cErr } = await authClient.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Resolve instância (passada por id) ou pega a primeira (Principal)
    let instQuery = supabase.from("whatsapp_instances").select("*").order("created_at", { ascending: true }).limit(1);
    if (instanceId) instQuery = supabase.from("whatsapp_instances").select("*").eq("id", instanceId).limit(1) as any;
    const { data: instRows } = await instQuery;
    const inst = instRows?.[0] || null;
    const suffix = inst?.secret_suffix ?? "";

    const host = normalizeHost(Deno.env.get(`MEGA_API_HOST${suffix}`));
    const apiToken = Deno.env.get(`MEGA_API_TOKEN${suffix}`);
    const instanceKey = Deno.env.get(`MEGA_API_INSTANCE_KEY${suffix}`);

    const credsConfigured = !!(host && apiToken && instanceKey);

    if (action === "status") {
      if (!credsConfigured) {
        return ok({ configured: false, status: "not_configured", instance: inst });
      }

      // Consultar Mega API
      const url = `${host}/rest/instance/${instanceKey}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
      const out = await r.json().catch(() => ({}));
      console.log("[whatsapp-instance] status:", r.status, JSON.stringify(out).slice(0, 300));

      const status = out?.instance?.status || out?.status || "unknown";
      const phone = out?.instance?.user?.id?.replace(/\D/g, "") || out?.instance?.phone || null;

      const upsert = {
        provider: "mega_api",
        instance_key: instanceKey!,
        status,
        phone_number: phone,
        last_sync_at: new Date().toISOString(),
      };
      if (inst) {
        await supabase.from("whatsapp_instances").update(upsert).eq("id", inst.id);
      } else {
        await supabase.from("whatsapp_instances").insert(upsert);
      }

      return ok({ configured: true, status, phone, instance: { ...(inst || {}), ...upsert }, raw: out });
    }

    if (action === "webhook" || action === "configure_webhook") {
      if (!credsConfigured) return ok({ configured: false });

      const webhookUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/mega-webhook${inst?.id ? `?instance_id=${inst.id}` : ""}`;

      if (action === "configure_webhook") {
        const url = `${host}/rest/webhook/${instanceKey}/configWebhook`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
          body: JSON.stringify({ messageData: { webhookUrl, webhookEnabled: true } }),
        });
        const out = await r.json().catch(() => ({}));
        console.log("[whatsapp-instance] configure webhook:", r.status, JSON.stringify(out).slice(0, 300));

        const eventsUrl = `${host}/rest/config/${instanceKey}/configAcceptWebhooks`;
        const eventsResponse = await fetch(eventsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
          body: JSON.stringify({
            messageData: {
              acceptWebhook: [
                "+messagesInput",
                "+messagesOutput",
                "+messagesUpdate",
                "+messagesAck",
                "+messagesReaction",
                "+connection",
              ],
            },
          }),
        });
        const eventsOut = await eventsResponse.json().catch(() => ({}));
        console.log("[whatsapp-instance] configure webhook events:", eventsResponse.status, JSON.stringify(eventsOut).slice(0, 300));

        return ok({ ok: r.ok && eventsResponse.ok, webhookUrl, raw: out, events: eventsOut }, r.ok && eventsResponse.ok ? 200 : 502);
      }

      const url = `${host}/rest/webhook/${instanceKey}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
      const out = await r.json().catch(() => ({}));
      console.log("[whatsapp-instance] webhook:", r.status, JSON.stringify(out).slice(0, 300));
      return ok({ ok: r.ok, expectedWebhookUrl: webhookUrl, raw: out }, r.ok ? 200 : 502);
    }

    if (action === "qrcode") {
      if (!credsConfigured) return ok({ configured: false });
      const url = `${host}/rest/instance/qrcode_base64/${instanceKey}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
      const out = await r.json().catch(() => ({}));
      const qr = out?.qrcode || out?.base64 || out?.qr || null;

      if (qr) {
        if (inst) await supabase.from("whatsapp_instances").update({ qr_code: qr, status: "qr_pending" }).eq("id", inst.id);
      }

      return ok({ qrcode: qr, raw: out });
    }

    if (action === "disconnect") {
      if (!credsConfigured) return ok({ configured: false });
      const url = `${host}/rest/instance/${instanceKey}/logout`;
      const r = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${apiToken}` } });
      const out = await r.json().catch(() => ({}));
      await supabase.from("whatsapp_instances").update({ status: "disconnected", qr_code: null }).eq("instance_key", instanceKey!);
      return ok({ ok: true, raw: out });
    }

    return ok({ error: "ação inválida" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[whatsapp-instance]", msg);
    return ok({ error: msg }, 500);
  }

  function ok(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Endpoint público para capturar leads de formulários do site, landing pages,
// Meta Lead Ads, Google Ads ou qualquer fonte externa.
// POST JSON: { name, phone, email?, procedure?, source?, utm_source?, utm_medium?,
//   utm_campaign?, utm_term?, utm_content?, referrer?, landing_page?, message? }
//
// Também aceita formato Meta Lead Ads: { entry: [{ changes: [{ value: { leadgen_id, ... } }] }] }
// (apenas captura básica — a Meta exige verificação de webhook via hub.challenge no GET)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function normalizePhone(s: string): string {
  return (s || "").replace(/\D/g, "");
}

function pickStr(o: any, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = k.split(".").reduce((acc: any, p) => acc?.[p], o);
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Verificação Meta: GET com hub.challenge
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    if (challenge) return new Response(challenge, { status: 200, headers: corsHeaders });
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const raw = await req.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = { raw }; }

    // Detecta formato Meta Lead Ads
    const metaEntry = body?.entry?.[0]?.changes?.[0]?.value;
    if (metaEntry?.field_data) {
      const fields: Record<string, string> = {};
      for (const f of metaEntry.field_data) {
        if (f?.name && f?.values?.[0]) fields[f.name] = String(f.values[0]);
      }
      // Identifica respostas das perguntas customizadas (acentos/maiúsculas/underscores variam)
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      let f_incomodo: string | null = null;
      let f_tempo: string | null = null;
      let f_motivacao: string | null = null;
      for (const [k, v] of Object.entries(fields)) {
        const n = norm(k);
        if (!f_incomodo && n.includes("incomod")) f_incomodo = v;
        else if (!f_tempo && (n.includes("quanto_tempo") || n.includes("ha_quanto") || n.includes("tempo"))) f_tempo = v;
        else if (!f_motivacao && (n.includes("motiv") || n.includes("transforma"))) f_motivacao = v;
      }
      body = {
        name: fields.full_name || fields.name || "Lead Meta Ads",
        phone: fields.phone_number || fields.phone || "",
        email: fields.email,
        procedure: fields.procedimento || fields.procedure,
        source: "Meta Ads",
        utm_source: "meta_ads",
        utm_medium: "paid_social",
        utm_campaign: metaEntry.ad_id || metaEntry.campaign_id || null,
        utm_content: metaEntry.form_id || null,
        form_incomodo: f_incomodo,
        form_tempo: f_tempo,
        form_motivacao: f_motivacao,
      };
    }

    const name = pickStr(body, "name", "full_name") || "Lead sem nome";
    const phone = normalizePhone(pickStr(body, "phone", "phone_number", "telefone", "whatsapp") || "");
    if (!phone) return json({ ok: false, error: "phone obrigatório" }, 400);

    const email = pickStr(body, "email");
    const procedure = pickStr(body, "procedure", "interesse") || "A definir";
    const utm_source = pickStr(body, "utm_source");
    const utm_medium = pickStr(body, "utm_medium");
    const utm_campaign = pickStr(body, "utm_campaign");
    const utm_term = pickStr(body, "utm_term");
    const utm_content = pickStr(body, "utm_content");
    const referrer = pickStr(body, "referrer", "referer");
    const landing_page = pickStr(body, "landing_page", "page", "url");
    const message = pickStr(body, "message", "mensagem");
    const ctwa_clid = pickStr(body, "ctwa_clid", "ctwaClid", "fbclid");
    const ad_id = pickStr(body, "ad_id", "adId", "ad_set_id");
    const ad_headline = pickStr(body, "ad_headline", "ad_name", "adName");

    const form_incomodo = pickStr(body, "form_incomodo", "incomodo");
    const form_tempo = pickStr(body, "form_tempo", "tempo_incomodo");
    const form_motivacao = pickStr(body, "form_motivacao", "motivacao");

    // source padrão pra ficar visível em filtros antigos
    const source = pickStr(body, "source") || (utm_source ? `${utm_source}${utm_campaign ? ` / ${utm_campaign}` : ""}` : "Site");

    // Dedup por telefone (10 últimos dígitos)
    const last10 = phone.slice(-10);
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("phone_normalized", last10)
      .maybeSingle();

    let leadId: string;
    if (existing) {
      // Atualiza UTMs se vieram (não sobrescreve com null)
      const update: Record<string, unknown> = { last_interaction: new Date().toISOString() };
      if (utm_source) update.utm_source = utm_source;
      if (utm_medium) update.utm_medium = utm_medium;
      if (utm_campaign) update.utm_campaign = utm_campaign;
      if (utm_term) update.utm_term = utm_term;
      if (utm_content) update.utm_content = utm_content;
      if (referrer) update.referrer = referrer;
      if (landing_page) update.landing_page = landing_page;
      if (email) update.email = email;
      if (form_incomodo) update.form_incomodo = form_incomodo;
      if (form_tempo) update.form_tempo = form_tempo;
      if (form_motivacao) update.form_motivacao = form_motivacao;
      if (ctwa_clid) update.ctwa_clid = ctwa_clid;
      if (ad_id) update.ad_id = ad_id;
      if (ad_headline) update.ad_headline = ad_headline;
      await supabase.from("leads").update(update).eq("id", existing.id);
      leadId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("leads")
        .insert({
          name,
          phone,
          email,
          procedure,
          source,
          stage: "novo_lead",
          utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          referrer, landing_page,
          form_incomodo, form_tempo, form_motivacao,
          ctwa_clid, ad_id, ad_headline,
          last_interaction: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) {
        // Race: outro request criou em paralelo. Busca existente.
        console.warn("[lead-capture] insert race, fetching existing:", error.message);
        const { data: race } = await supabase
          .from("leads").select("id").eq("phone_normalized", last10).maybeSingle();
        if (!race) return json({ ok: false, error: error.message }, 500);
        leadId = race.id;
      } else {
        leadId = created.id;
      }
    }

    // Mensagem inicial vira nota
    if (message) {
      await supabase.from("lead_notes").insert({
        lead_id: leadId,
        content: `📩 Mensagem do formulário: ${message}`,
        author: "Sistema",
      });
    }

    return json({ ok: true, lead_id: leadId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[lead-capture] error:", msg);
    return json({ ok: false, error: msg }, 500);
  }
});

// Webhook público que recebe eventos do n8n (mensagens WhatsApp normalizadas)
// Cria/atualiza lead + conversa + mensagem
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(input: string): string {
  return (input || "").replace(/@.*$/, "").replace(/\D/g, "");
}

function pick<T = unknown>(obj: any, ...keys: string[]): T | null {
  for (const k of keys) {
    const parts = k.split(".");
    let v = obj;
    for (const p of parts) v = v?.[p];
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Aceita JSON, string JSON, form-urlencoded e objetos aninhados
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";
    const rawText = await req.text();
    console.log("[n8n-whatsapp-webhook] content-type:", contentType);
    console.log("[n8n-whatsapp-webhook] raw:", rawText.slice(0, 1000));

    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        // form-urlencoded
        if (contentType.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams(rawText);
          body = Object.fromEntries(params.entries());
        } else {
          body = { raw: rawText };
        }
      }
    }

    // Se o n8n empacotou tudo dentro de uma chave string (bug comum), desempacota
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const keys = Object.keys(body);
      // Caso 1: única chave que é JSON string
      if (keys.length === 1) {
        const onlyKey = keys[0];
        const onlyVal = body[onlyKey];
        // Tenta parsear a chave como JSON
        try {
          const parsedKey = JSON.parse(onlyKey);
          if (parsedKey && typeof parsedKey === "object") body = parsedKey;
        } catch {}
        // Tenta parsear o valor como JSON
        if (typeof onlyVal === "string") {
          try {
            const parsedVal = JSON.parse(onlyVal);
            if (parsedVal && typeof parsedVal === "object") body = parsedVal;
          } catch {}
        }
      }
      // Caso 2: campo "body" ou "data" dentro do payload (n8n webhook trigger)
      if (body.body && typeof body.body === "object") body = { ...body.body, ...body };
    }

    console.log("[n8n-whatsapp-webhook] parsed:", JSON.stringify(body).slice(0, 800));

    // Aceita formato simples (recomendado) OU formato bruto da Mega API
    const phoneRaw =
      pick<string>(body, "phone", "from", "number", "data.key.remoteJid", "key.remoteJid") || "";
    const phone = normalizePhone(phoneRaw);

    if (!phone) {
      return json({ ok: false, error: "phone obrigatório" }, 400);
    }

    const name = pick<string>(body, "name", "contact_name", "pushName", "data.pushName");
    const messageId = pick<string>(body, "message_id", "wid", "id", "data.key.id", "key.id");
    const mediaUrl = pick<string>(body, "media_url", "mediaUrl");
    const mediaType = pick<string>(body, "media_type", "mediaType");

    // Direção: default inbound. Aceita "fromMe": true como outbound.
    const fromMe = body?.fromMe === true || body?.data?.key?.fromMe === true || body?.direction === "outbound";
    const direction = fromMe ? "outbound" : "inbound";

    // Conteúdo: aceita vários formatos
    const m = body?.message || body?.data?.message || {};
    const content =
      pick<string>(body, "message", "text", "content", "body") ||
      m?.conversation ||
      m?.extendedTextMessage?.text ||
      m?.imageMessage?.caption ||
      m?.videoMessage?.caption ||
      m?.documentMessage?.caption ||
      (mediaType === "image" ? "[imagem]" : "") ||
      (mediaType === "video" ? "[vídeo]" : "") ||
      (mediaType === "audio" ? "[áudio]" : "") ||
      (mediaType === "document" ? "[documento]" : "") ||
      "";

    // 1) Achar/criar lead pelo telefone (match nos últimos 10 dígitos)
    const last10 = phone.slice(-10);
    let leadId: string | null = null;
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, name")
      .eq("phone_normalized", last10)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          name: name || `WhatsApp ${last10.slice(-4)}`,
          phone,
          source: "WhatsApp",
          procedure: "A definir",
          stage: "novo_lead",
        })
        .select("id")
        .single();
      if (leadErr) {
        console.warn("[n8n-whatsapp-webhook] lead insert race:", leadErr.message);
        const { data: race } = await supabase.from("leads").select("id").eq("phone_normalized", last10).maybeSingle();
        leadId = race?.id || null;
      } else {
        leadId = newLead?.id || null;
      }
    }

    // 2) Achar/criar conversa
    let convId: string | null = null;
    const { data: existingConv } = await supabase
      .from("chat_conversations")
      .select("id, unread_count")
      .eq("phone_normalized", last10)
      .eq("channel", "whatsapp")
      .maybeSingle();

    if (existingConv) {
      convId = existingConv.id;
      await supabase.from("chat_conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.slice(0, 120),
        unread_count: fromMe ? existingConv.unread_count : (existingConv.unread_count || 0) + 1,
        contact_name: name || undefined,
        lead_id: leadId,
        status: "active",
      }).eq("id", convId);
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({
          channel: "whatsapp",
          whatsapp_number: phone,
          contact_name: name,
          lead_id: leadId,
          status: "active",
          last_message_at: new Date().toISOString(),
          last_message_preview: content.slice(0, 120),
          unread_count: fromMe ? 0 : 1,
        })
        .select("id")
        .single();
      if (convErr) {
        console.warn("[n8n-whatsapp-webhook] conv insert race:", convErr.message);
        const { data: race } = await supabase
          .from("chat_conversations").select("id")
          .eq("phone_normalized", last10).eq("channel","whatsapp").maybeSingle();
        convId = race?.id || null;
      } else {
        convId = newConv?.id || null;
      }
    }

    // 3) Inserir mensagem (deduplica por whatsapp_message_id se vier)
    let messageInserted = false;
    if (convId && content) {
      if (messageId) {
        const { data: dup } = await supabase
          .from("chat_messages")
          .select("id")
          .eq("whatsapp_message_id", messageId)
          .maybeSingle();
        if (dup) {
          console.log("[n8n-whatsapp-webhook] mensagem duplicada, ignorando:", messageId);
        } else {
          await insertMsg();
        }
      } else {
        await insertMsg();
      }
    }

    async function insertMsg() {
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role: fromMe ? "assistant" : "user",
        direction,
        content,
        whatsapp_message_id: messageId,
        media_url: mediaUrl,
        media_type: mediaType,
        sender_name: name,
        status: "delivered",
      });
      if (error) console.error("[n8n-whatsapp-webhook] msg insert err:", error);
      else messageInserted = true;
    }

    // 4) Atualizar last_interaction do lead
    if (leadId) {
      await supabase.from("leads").update({ last_interaction: new Date().toISOString() }).eq("id", leadId);
    }

    return json({
      ok: true,
      lead_id: leadId,
      conversation_id: convId,
      message_inserted: messageInserted,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[n8n-whatsapp-webhook] error:", msg);
    return json({ ok: false, error: msg }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

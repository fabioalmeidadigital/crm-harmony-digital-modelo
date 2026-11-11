// Webhook público que recebe eventos da Mega API (mensagens recebidas/enviadas)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(jid: string): string {
  // Remove @s.whatsapp.net, @c.us, espaços, +, etc
  return (jid || "").replace(/@.*$/, "").replace(/\D/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const payload = await req.json();
    console.log("[whatsapp-webhook] payload:", JSON.stringify(payload).slice(0, 500));

    // Mega API envia em formatos variados — tentamos extrair o essencial
    const messages = payload?.messages || (payload?.message ? [payload.message] : []) || [];
    const data = payload?.data || payload;

    // Tentativa 1: formato { key: { remoteJid, fromMe, id }, message: {...}, pushName }
    const msg = data?.key ? data : (messages[0] || null);

    if (!msg?.key?.remoteJid) {
      console.log("[whatsapp-webhook] payload sem mensagem reconhecível, ignorando");
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = normalizePhone(msg.key.remoteJid);
    const fromMe = !!msg.key.fromMe;
    const wid = msg.key.id;
    const pushName = msg.pushName || data?.pushName || null;

    // Extrair conteúdo
    const m = msg.message || {};
    const content =
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.documentMessage?.caption ||
      (m.audioMessage ? "[áudio]" : "") ||
      (m.imageMessage ? "[imagem]" : "") ||
      (m.videoMessage ? "[vídeo]" : "") ||
      (m.documentMessage ? "[documento]" : "") ||
      "";

    let mediaType: string | null = null;
    let mediaUrl: string | null = null;
    if (m.imageMessage) { mediaType = "image"; mediaUrl = m.imageMessage.url || null; }
    else if (m.videoMessage) { mediaType = "video"; mediaUrl = m.videoMessage.url || null; }
    else if (m.audioMessage) { mediaType = "audio"; mediaUrl = m.audioMessage.url || null; }
    else if (m.documentMessage) { mediaType = "document"; mediaUrl = m.documentMessage.url || null; }

    // 1) Achar/criar lead pelo telefone
    let leadId: string | null = null;
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .ilike("phone", `%${phone.slice(-10)}%`)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      // Se a mensagem é fromMe (enviada pela própria conta conectada), o pushName
      // é o nome do dono da conta, não do contato. Nesse caso usamos fallback.
      const safeName = (!fromMe && pushName) ? pushName : `WhatsApp ${phone.slice(-4)}`;
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          name: safeName,
          phone,
          source: "WhatsApp",
          procedure: "A definir",
          stage: "novo_lead",
        })
        .select("id")
        .single();
      leadId = newLead?.id || null;
    }

    // 2) Achar/criar conversa
    let convId: string | null = null;
    const { data: existingConv } = await supabase
      .from("chat_conversations")
      .select("id, unread_count")
      .eq("whatsapp_number", phone)
      .eq("channel", "whatsapp")
      .maybeSingle();

    if (existingConv) {
      convId = existingConv.id;
      await supabase.from("chat_conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.slice(0, 120),
        unread_count: fromMe ? existingConv.unread_count : (existingConv.unread_count || 0) + 1,
        contact_name: (!fromMe && pushName) ? pushName : undefined,
        lead_id: leadId,
        status: "active",
      }).eq("id", convId);
    } else {
      const { data: newConv } = await supabase
        .from("chat_conversations")
        .insert({
          channel: "whatsapp",
          whatsapp_number: phone,
          contact_name: (!fromMe && pushName) ? pushName : null,
          lead_id: leadId,
          status: "active",
          last_message_at: new Date().toISOString(),
          last_message_preview: content.slice(0, 120),
          unread_count: fromMe ? 0 : 1,
        })
        .select("id")
        .single();
      convId = newConv?.id || null;
    }

    // 3) Inserir mensagem
    if (convId) {
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role: fromMe ? "assistant" : "user",
        direction: fromMe ? "outbound" : "inbound",
        content,
        whatsapp_message_id: wid,
        media_url: mediaUrl,
        media_type: mediaType,
        sender_name: pushName,
        status: "delivered",
      });
    }

    return new Response(JSON.stringify({ ok: true, conversation_id: convId, lead_id: leadId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[whatsapp-webhook] error:", e);
    const msg = e instanceof Error ? e.message : "erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

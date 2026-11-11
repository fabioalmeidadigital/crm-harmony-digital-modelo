// Envia mensagem (texto/imagem/vídeo/áudio/documento) via Mega API e grava no banco
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

// Extrai o id da mensagem da resposta da Mega API (variações conhecidas)
function extractMsgId(out: any): string | null {
  return (
    out?.messageData?.key?.id ||
    out?.data?.key?.id ||
    out?.message?.key?.id ||
    out?.key?.id ||
    out?.messageId ||
    out?.id ||
    null
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: cErr } = await authClient.auth.getClaims(token);
  if (cErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const {
      conversation_id,
      content,        // texto (opcional se enviar mídia)
      media_url,      // URL pública da mídia (do bucket whatsapp-media)
      media_type,     // 'image' | 'video' | 'audio' | 'document'
      media_name,     // nome do arquivo (para documentos)
      caption,        // legenda opcional para imagem/vídeo
    } = body || {};

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!content && !media_url) {
      return new Response(JSON.stringify({ error: "envie content ou media_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conv, error: convErr } = await supabase
      .from("chat_conversations")
      .select("id, whatsapp_number, whatsapp_instance_id")
      .eq("id", conversation_id)
      .single();
    if (convErr || !conv?.whatsapp_number) throw new Error("Conversa não encontrada ou sem número WhatsApp");

    // Resolve instância: usa a vinculada à conversa, senão a primeira (Principal)
    let inst: any = null;
    if (conv.whatsapp_instance_id) {
      const { data } = await supabase.from("whatsapp_instances").select("*").eq("id", conv.whatsapp_instance_id).maybeSingle();
      inst = data;
    }
    if (!inst) {
      const { data } = await supabase.from("whatsapp_instances").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
      inst = data;
    }
    const suffix = inst?.secret_suffix ?? "";

    const host = normalizeHost(Deno.env.get(`MEGA_API_HOST${suffix}`));
    const apiToken = Deno.env.get(`MEGA_API_TOKEN${suffix}`);
    const instanceKey = Deno.env.get(`MEGA_API_INSTANCE_KEY${suffix}`);

    let waId: string | null = null;
    let sendStatus = "pending";

    if (host && apiToken && instanceKey) {
      // Garante o formato @s.whatsapp.net pra contatos individuais
      const rawTo = String(conv.whatsapp_number).replace(/\D/g, "");
      const toJid = rawTo.includes("@") ? conv.whatsapp_number : `${rawTo}@s.whatsapp.net`;

      let url: string;
      let payload: any;

      if (media_url && media_type) {
        // ptt = áudio gravado (mensagem de voz, igual WhatsApp Web)
        // audio = arquivo de áudio compartilhado
        // Detecta gravação: nome termina em .webm/.opus ou começa com "audio-"
        const isVoiceNote = media_type === "audio" && (
          /\.(webm|opus|ogg)$/i.test(media_name || "") ||
          /^audio-\d+/i.test(media_name || "")
        );
        const waType =
          media_type === "image" ? "image" :
          media_type === "video" ? "video" :
          media_type === "audio" ? (isVoiceNote ? "ptt" : "audio") :
          "document";

        const mimeType =
          waType === "image" ? "image/jpeg" :
          waType === "video" ? "video/mp4" :
          waType === "ptt" || waType === "audio" ? "audio/ogg; codecs=opus" :
          (media_name?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");

        url = `${host}/rest/sendMessage/${instanceKey}/mediaUrl`;
        payload = {
          messageData: {
            to: toJid,
            url: media_url,
            fileName: media_name || `arquivo.${waType === "ptt" ? "ogg" : waType === "image" ? "jpg" : waType === "video" ? "mp4" : "bin"}`,
            type: waType,
            caption: caption || content || "",
            mimeType,
          },
        };
      } else {
        // texto puro
        url = `${host}/rest/sendMessage/${instanceKey}/text`;
        payload = { messageData: { to: toJid, text: content } };
      }

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(payload),
      });
      const out = await resp.json().catch(() => ({}));
      console.log("[whatsapp-send]", url, resp.status, JSON.stringify(out).slice(0, 400));
      if (!resp.ok) {
        const rawMsg = out?.message || out?.error || `Mega API erro ${resp.status}`;
        if (String(rawMsg).toLowerCase().includes("not logged in") || resp.status === 403) {
          throw new Error("WhatsApp desconectado. Peça ao admin para reconectar a instância (escanear QR Code).");
        }
        throw new Error(rawMsg);
      }
      waId = extractMsgId(out);
      sendStatus = "sent";
    } else {
      console.log("[whatsapp-send] credenciais Mega API ausentes — gravando como rascunho");
      sendStatus = "draft";
    }

    // Conteúdo a salvar no banco (texto OU placeholder de mídia)
    const dbContent = content || (
      media_type === "image" ? "[imagem]" :
      media_type === "video" ? "[vídeo]" :
      media_type === "audio" ? "[áudio]" :
      media_type === "document" ? `[documento${media_name ? `: ${media_name}` : ""}]` :
      ""
    );

    const { data: msg } = await supabase.from("chat_messages").insert({
      conversation_id,
      role: "assistant",
      direction: "outbound",
      content: dbContent,
      media_url: media_url || null,
      media_type: media_type || null,
      whatsapp_message_id: waId,
      status: sendStatus,
      sender_name: "Atendente",
    }).select().single();

    await supabase.from("chat_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: dbContent.slice(0, 120),
      unread_count: 0,
    }).eq("id", conversation_id);

    return new Response(JSON.stringify({ ok: true, message: msg, status: sendStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[whatsapp-send] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

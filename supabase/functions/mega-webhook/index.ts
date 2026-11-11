// Webhook público que recebe eventos DIRETO da Mega API
// Cria/atualiza lead + conversa + mensagem. Baixa mídia recebida para o storage.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(input: string): string {
  return (input || "").replace(/@.*$/, "").replace(/\D/g, "");
}

function cleanText(s: string | null | undefined): string {
  if (s === null || s === undefined) return "";
  if (typeof s !== "string") return "";
  return s.replace(/^=+/, "").trim();
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

function pickString(obj: any, ...keys: string[]): string {
  for (const k of keys) {
    const parts = k.split(".");
    let v: any = obj;
    for (const p of parts) v = v?.[p];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return "";
}

function normalizeHost(host?: string | null) {
  if (!host) return null;
  const trimmed = host.trim().replace(/\/$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Baixa mídia da Mega API (precisa do messageId) → faz upload no storage → retorna URL pública
async function downloadAndStoreMedia(
  supabase: any,
  messageId: string,
  mediaType: string,
  mimetype: string | null,
  suffix: string,
): Promise<string | null> {
  try {
    const host = normalizeHost(Deno.env.get(`MEGA_API_HOST${suffix}`));
    const apiToken = Deno.env.get(`MEGA_API_TOKEN${suffix}`);
    const instanceKey = Deno.env.get(`MEGA_API_INSTANCE_KEY${suffix}`);
    if (!host || !apiToken || !instanceKey) return null;

    // Endpoint Mega para baixar mídia em base64
    const url = `${host}/rest/instance/downloadMediaMessage/${instanceKey}`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ messageData: { id: messageId } }),
    });
    if (!r.ok) {
      console.error("[mega-webhook] download falhou:", r.status, await r.text().catch(() => ""));
      return null;
    }
    const out = await r.json().catch(() => ({}));
    const base64 = out?.fileBase64 || out?.base64 || out?.data || out?.media || null;
    if (!base64) {
      console.error("[mega-webhook] download sem base64:", JSON.stringify(out).slice(0, 300));
      return null;
    }

    // Detecta extensão pelo mime
    const ext =
      mimetype?.includes("jpeg") || mimetype?.includes("jpg") ? "jpg" :
      mimetype?.includes("png") ? "png" :
      mimetype?.includes("webp") ? "webp" :
      mimetype?.includes("mp4") ? "mp4" :
      mimetype?.includes("ogg") || mimetype?.includes("opus") ? "ogg" :
      mimetype?.includes("mpeg") || mimetype?.includes("mp3") ? "mp3" :
      mimetype?.includes("pdf") ? "pdf" :
      mediaType === "image" ? "jpg" :
      mediaType === "video" ? "mp4" :
      mediaType === "audio" ? "ogg" :
      "bin";

    // Decodifica base64 → bytes
    const cleanB64 = String(base64).replace(/^data:[^;]+;base64,/, "");
    const bytes = Uint8Array.from(atob(cleanB64), c => c.charCodeAt(0));

    const fileName = `${mediaType}/${messageId}.${ext}`;
    const { error } = await supabase.storage
      .from("whatsapp-media")
      .upload(fileName, bytes, {
        contentType: mimetype || "application/octet-stream",
        upsert: true,
      });
    if (error) {
      console.error("[mega-webhook] storage upload err:", error);
      return null;
    }

    const { data: pub } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
    return pub?.publicUrl || null;
  } catch (e) {
    console.error("[mega-webhook] downloadAndStoreMedia error:", e);
    return null;
  }
}

// Busca a foto de perfil do contato na Mega API, baixa e salva no storage
async function fetchAndStoreContactAvatar(
  supabase: any,
  phone: string,
  suffix: string,
): Promise<string | null> {
  try {
    const host = normalizeHost(Deno.env.get(`MEGA_API_HOST${suffix}`));
    const apiToken = Deno.env.get(`MEGA_API_TOKEN${suffix}`);
    const instanceKey = Deno.env.get(`MEGA_API_INSTANCE_KEY${suffix}`);
    if (!host || !apiToken || !instanceKey) return null;

    const jid = `${phone}@s.whatsapp.net`;

    const candidates: Array<{ url: string; method: string; body: any }> = [
      { url: `${host}/rest/instance/${instanceKey}/profilePicture?jid=${encodeURIComponent(jid)}`, method: "GET", body: null },
      { url: `${host}/rest/instance/profilePicture/${instanceKey}`, method: "POST", body: { jid } },
      { url: `${host}/rest/chat/getProfilePicture/${instanceKey}`, method: "POST", body: { jid } },
      { url: `${host}/rest/chat/profilePicture/${instanceKey}`, method: "POST", body: { number: phone } },
    ];

    let picUrl: string | null = null;
    for (const c of candidates) {
      try {
        const r = await fetch(c.url, {
          method: c.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: c.body ? JSON.stringify(c.body) : undefined,
        });
        if (!r.ok) continue;
        const out = await r.json().catch(() => ({}));
        picUrl =
          out?.profilePictureUrl ||
          out?.url ||
          out?.eurl ||
          out?.data?.url ||
          out?.data?.profilePictureUrl ||
          out?.result?.profilePictureUrl ||
          null;
        if (picUrl) break;
      } catch {
        // tenta próximo
      }
    }

    if (!picUrl) {
      console.log("[mega-webhook] sem foto de perfil para", phone);
      return null;
    }

    const imgRes = await fetch(picUrl);
    if (!imgRes.ok) return null;
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    const fileName = `avatars/${phone}.jpg`;

    const { error } = await supabase.storage
      .from("whatsapp-media")
      .upload(fileName, buf, { contentType: "image/jpeg", upsert: true });
    if (error) {
      console.error("[mega-webhook] avatar upload err:", error);
      return null;
    }
    const { data: pub } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
    return pub?.publicUrl ? `${pub.publicUrl}?v=${Date.now()}` : null;
  } catch (e) {
    console.error("[mega-webhook] fetchAndStoreContactAvatar error:", e);
    return null;
  }
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Resolve instância via ?instance_id= ou usa a primeira
    const url = new URL(req.url);
    const reqInstanceId = url.searchParams.get("instance_id");
    let inst: any = null;
    if (reqInstanceId) {
      const { data } = await supabase.from("whatsapp_instances").select("*").eq("id", reqInstanceId).maybeSingle();
      inst = data;
    }
    if (!inst) {
      const { data } = await supabase.from("whatsapp_instances").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
      inst = data;
    }
    const suffix = inst?.secret_suffix ?? "";
    const instanceId = inst?.id || null;

    const rawText = await req.text();
    const contentType = req.headers.get("content-type") || "";
    console.log("[mega-webhook] content-type:", contentType);
    console.log("[mega-webhook] raw:", rawText.slice(0, 1500));

    let body: any = {};
    if (rawText) {
      try { body = JSON.parse(rawText); }
      catch { body = { raw: rawText }; }
    }

    const data = body?.data && typeof body.data === "object" ? body.data : body;

    // Telefone
    // Grupos: ignora sempre
    const remoteJid = pickString(data, "key.remoteJid", "remoteJid") || pickString(body, "remoteJid");
    if (remoteJid.includes("@g.us") || data?.isGroup === true) {
      return json({ ok: true, skipped: "group message" });
    }

    // Migração LID do WhatsApp: em conversas individuais o remoteJid pode vir como
    // "<lid>@lid". O número real (PN) vem em campos paralelos, que variam conforme
    // a direção da mensagem. Sempre preferimos o PN.
    const isOutbound = data?.key?.fromMe === true || body?.fromMe === true || body?.direction === "outbound";
    const pnCandidates = [
      pickString(data, "key.remoteJidAlt", "key.senderPn", "key.participantPn"),
      isOutbound ? pickString(data, "key.recipientPn") : "",
      pickString(data, "senderPn", "recipientPn", "contactPn"),
      remoteJid.includes("@lid") ? "" : remoteJid,
      pickString(data, "from", "phone", "number"),
      pickString(body, "phone", "from", "number"),
    ].filter((v) => v && !v.includes("@lid") && !v.includes("@g.us"));

    const phoneRaw = pnCandidates[0] || "";
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      console.log("[mega-webhook] sem número real (só @lid) — ignorando:", remoteJid);
      return json({ ok: true, skipped: "no phone" });
    }
    // Números válidos têm entre 10 e 13 dígitos (Brasil e internacional)
    if (phone.length < 10 || phone.length > 13) {
      console.log("[mega-webhook] telefone com tamanho inválido, ignorando:", phone);
      return json({ ok: true, skipped: "invalid phone length" });
    }


    const rawName = cleanText(
      pick<string>(data, "pushName", "notifyName", "name", "contact_name") ||
      pick<string>(body, "pushName", "name", "contact_name")
    );

    const messageId = pick<string>(data, "key.id", "id", "message_id") ||
      pick<string>(body, "id", "message_id");

    const fromMe = data?.key?.fromMe === true || body?.fromMe === true || body?.direction === "outbound";

    // Se a mensagem é fromMe, o pushName é o dono da conta (a própria clínica),
    // NÃO o contato. Só usamos o nome quando a mensagem veio do contato.
    const name = fromMe ? "" : rawName;

    // Detecta mídia no payload da Mega (formato Baileys)
    const m = data?.message || {};
    let mediaType: string | null = null;
    let mediaMime: string | null = null;
    let mediaCaption = "";
    let mediaFileName: string | null = null;

    if (m.imageMessage) {
      mediaType = "image";
      mediaMime = m.imageMessage.mimetype || "image/jpeg";
      mediaCaption = m.imageMessage.caption || "";
    } else if (m.videoMessage) {
      mediaType = "video";
      mediaMime = m.videoMessage.mimetype || "video/mp4";
      mediaCaption = m.videoMessage.caption || "";
    } else if (m.audioMessage) {
      mediaType = "audio";
      mediaMime = m.audioMessage.mimetype || "audio/ogg";
    } else if (m.documentMessage) {
      mediaType = "document";
      mediaMime = m.documentMessage.mimetype || "application/octet-stream";
      mediaCaption = m.documentMessage.caption || "";
      mediaFileName = m.documentMessage.fileName || null;
    } else if (m.stickerMessage) {
      mediaType = "image";
      mediaMime = m.stickerMessage.mimetype || "image/webp";
    }

    // Texto — extrai apenas strings para evitar "[object Object]"
    const buttonsReply =
      m.buttonsResponseMessage?.selectedDisplayText ||
      m.templateButtonReplyMessage?.selectedDisplayText ||
      m.listResponseMessage?.title ||
      m.listResponseMessage?.singleSelectReply?.selectedRowId ||
      "";
    const reaction = m.reactionMessage?.text ? `Reagiu: ${m.reactionMessage.text}` : "";
    const location = m.locationMessage ? "[localização]" : "";
    const contactCard = m.contactMessage ? `[contato: ${m.contactMessage.displayName || ""}]` : "";
    const content = cleanText(
      (typeof m.conversation === "string" ? m.conversation : "") ||
      (typeof m.extendedTextMessage?.text === "string" ? m.extendedTextMessage.text : "") ||
      mediaCaption ||
      buttonsReply ||
      reaction ||
      location ||
      contactCard ||
      pickString(body, "message", "text", "content", "body") ||
      ""
    );

    if (!content && !mediaType) {
      console.log("[mega-webhook] sem conteúdo — ignorando");
      return json({ ok: true, skipped: "empty content" });
    }

    // Dedupe por messageId
    if (messageId) {
      const { data: dup } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("whatsapp_message_id", messageId)
        .maybeSingle();
      if (dup) {
        console.log("[mega-webhook] duplicada:", messageId);
        return json({ ok: true, skipped: "duplicate" });
      }
    }

    // Extrai UTMs do texto da mensagem (formato wa.me com query string codificada)
    // Aceita: "Vim do Instagram - utm_source=ig&utm_campaign=botox" ou só "utm_source=ig&utm_campaign=botox"
    const utm: Record<string, string> = {};
    if (content) {
      const utmRegex = /utm_(source|medium|campaign|term|content)=([^\s&|,;]+)/gi;
      let m: RegExpExecArray | null;
      while ((m = utmRegex.exec(content)) !== null) {
        utm[`utm_${m[1].toLowerCase()}`] = decodeURIComponent(m[2]);
      }
    }

    // Detecta anúncio "Clique para WhatsApp" da Meta (Facebook/Instagram Ads).
    // O provedor pode entregar externalAdReply / ctwaClid em profundidades diferentes
    // do payload, então procuramos recursivamente em todo o corpo recebido.
    function deepFind(obj: unknown, keys: string[], depth = 0): any {
      if (!obj || typeof obj !== "object" || depth > 8) return null;
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (keys.includes(k) && v) return v;
        const nested = deepFind(v, keys, depth + 1);
        if (nested) return nested;
      }
      return null;
    }

    const adReply = deepFind(body, ["externalAdReply"]);
    const ctwaClidRaw = deepFind(body, ["ctwaClid", "ctwa_clid"]);
    const ctwaClid = typeof ctwaClidRaw === "string" ? ctwaClidRaw : (adReply?.ctwaClid ?? null);
    let adSourceLabel: string | null = null;
    let adId: string | null = null;
    let adHeadline: string | null = null;

    if (adReply || ctwaClid) {
      const adTitle = cleanText(adReply?.title || "");
      const adBody = cleanText(adReply?.body || "");
      const adSourceUrl = adReply?.sourceUrl || "";
      const adSourceId = adReply?.sourceId || ctwaClid || "";
      // sourceType: "ad" | "post" — em ambos os casos veio do Meta
      adSourceLabel = "Meta Ads";
      adId = adReply?.sourceId ? String(adReply.sourceId).slice(0, 120) : null;
      adHeadline = adTitle ? adTitle.slice(0, 200) : null;
      if (!utm.utm_source) utm.utm_source = "meta_ads";
      if (!utm.utm_medium) utm.utm_medium = "cpc";
      if (!utm.utm_campaign && adTitle) utm.utm_campaign = adTitle.slice(0, 120);
      if (!utm.utm_content && (adBody || adSourceId)) utm.utm_content = String(adBody || adSourceId).slice(0, 120);
      // Se a sourceUrl trouxer utms, sobrescreve com o que veio da URL
      if (adSourceUrl) {
        try {
          const u = new URL(adSourceUrl);
          for (const k of ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"]) {
            const v = u.searchParams.get(k);
            if (v) utm[k] = v;
          }
        } catch { /* ignore */ }
      }
      console.log("[mega-webhook] anúncio detectado:", JSON.stringify({ adTitle, adBody, adSourceUrl, adSourceId, ctwaClid }).slice(0, 400));
    }

    // Referrer/landing page quando a primeira mensagem traz um link rastreado
    let trackedUrl: string | null = null;
    if (content) {
      const urlMatch = content.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        trackedUrl = urlMatch[0].slice(0, 500);
        try {
          const u = new URL(trackedUrl);
          for (const k of ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"]) {
            const v = u.searchParams.get(k);
            if (v && !utm[k]) utm[k] = v;
          }
        } catch { /* ignore */ }
      }
    }

    const hasUtm = Object.keys(utm).length > 0;
    const adFields: Record<string, unknown> = {};
    if (ctwaClid) adFields.ctwa_clid = String(ctwaClid).slice(0, 200);
    if (adId) adFields.ad_id = adId;
    if (adHeadline) adFields.ad_headline = adHeadline;
    if (adReply?.sourceUrl) adFields.landing_page = String(adReply.sourceUrl).slice(0, 500);
    else if (trackedUrl) adFields.landing_page = trackedUrl;

    // 1) Lead
    const last10 = phone.slice(-10);
    let leadId: string | null = null;
    // Lookup por telefone normalizado (chave única no banco)
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, utm_source, name, source, ctwa_clid")
      .eq("phone_normalized", last10)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
      // Mantém stage atual; aplica UTMs só se ainda não tiver; nome só se vazio
      const partial: Record<string, unknown> = {};
      if (hasUtm && !existingLead.utm_source) Object.assign(partial, utm);
      if (!existingLead.ctwa_clid) Object.assign(partial, adFields);
      // Se veio de anúncio e o lead ainda está marcado como "WhatsApp", promove pra "Meta Ads"
      if (adSourceLabel && (!existingLead.source || existingLead.source === "WhatsApp")) {
        partial.source = adSourceLabel;
      }
      if (name && (!existingLead.name || existingLead.name.startsWith("WhatsApp "))) partial.name = name;
      if (Object.keys(partial).length) {
        await supabase.from("leads").update(partial).eq("id", leadId);
      }
    } else {
      const sourceLabel = adSourceLabel
        ? adSourceLabel
        : hasUtm
        ? `${utm.utm_source || "WhatsApp"}${utm.utm_campaign ? ` / ${utm.utm_campaign}` : ""}`
        : "WhatsApp";
      const { data: newLead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          name: name || `WhatsApp ${last10.slice(-4)}`,
          phone,
          source: sourceLabel,
          procedure: "A definir",
          stage: "novo_lead",
          ...utm,
          ...adFields,
        })
        .select("id")
        .single();
      if (leadErr) {
        // Race condition: outro webhook criou o lead em paralelo. Busca o existente.
        console.warn("[mega-webhook] insert race, fetching existing:", leadErr.message);
        const { data: raceLead } = await supabase
          .from("leads")
          .select("id")
          .eq("phone_normalized", last10)
          .maybeSingle();
        leadId = raceLead?.id || null;
      } else {
        leadId = newLead?.id || null;
      }
    }

    // 2) Conversa
    let convId: string | null = null;
    const { data: existingConv } = await supabase
      .from("chat_conversations")
      .select("id, unread_count, avatar_url")
      .eq("phone_normalized", last10)
      .eq("channel", "whatsapp")
      .maybeSingle();

    const previewText = (content || `[${mediaType || "mídia"}]`).slice(0, 120);

    if (existingConv) {
      convId = existingConv.id;
      const update: Record<string, unknown> = {
        last_message_at: new Date().toISOString(),
        last_message_preview: previewText,
        unread_count: fromMe ? existingConv.unread_count : (existingConv.unread_count || 0) + 1,
        contact_name: name || undefined,
        lead_id: leadId,
        status: "active",
        whatsapp_instance_id: instanceId,
      };
      // Busca avatar se ainda não tem
      if (!existingConv.avatar_url) {
        const avatar = await fetchAndStoreContactAvatar(supabase, phone, suffix);
        if (avatar) update.avatar_url = avatar;
      }
      await supabase.from("chat_conversations").update(update).eq("id", convId);
    } else {
      const avatar = await fetchAndStoreContactAvatar(supabase, phone, suffix);
      const { data: newConv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({
          channel: "whatsapp",
          whatsapp_number: phone,
          contact_name: name || null,
          lead_id: leadId,
          status: "active",
          last_message_at: new Date().toISOString(),
          last_message_preview: previewText,
          unread_count: fromMe ? 0 : 1,
          avatar_url: avatar,
          whatsapp_instance_id: instanceId,
        })
        .select("id")
        .single();
      if (convErr) {
        console.warn("[mega-webhook] conv insert race, fetching existing:", convErr.message);
        const { data: raceConv } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("phone_normalized", last10)
          .eq("channel", "whatsapp")
          .maybeSingle();
        convId = raceConv?.id || null;
      } else {
        convId = newConv?.id || null;
      }
    }

    // 3) Baixa mídia (se houver) e armazena
    let storedMediaUrl: string | null = null;
    if (mediaType && messageId) {
      storedMediaUrl = await downloadAndStoreMedia(supabase, messageId, mediaType, mediaMime, suffix);
      console.log("[mega-webhook] media stored:", storedMediaUrl);
    }

    // 4) Insere mensagem (ou atualiza se for eco do que NÓS enviamos)
    if (convId) {
      const finalContent = content || `[${mediaType || "mídia"}${mediaFileName ? `: ${mediaFileName}` : ""}]`;

      // dedupe extra: se vier eco fromMe, tentamos casar com nossa mensagem já salva

      // dedupe por id antes de inserir (segurança extra)
      let alreadyExists = false;
      if (messageId) {
        const { data: dup2 } = await supabase
          .from("chat_messages")
          .select("id")
          .eq("whatsapp_message_id", messageId)
          .maybeSingle();
        if (dup2) alreadyExists = true;
      }

      // Match por conteúdo/mídia recente (eco do nosso envio)
      if (fromMe && !alreadyExists) {
        const sinceIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: candidates } = await supabase
          .from("chat_messages")
          .select("id, whatsapp_message_id, content, media_type")
          .eq("conversation_id", convId)
          .eq("direction", "outbound")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(20);

        const match = (candidates || []).find(c => {
          if (c.whatsapp_message_id) return false; // já tem id, não é a nossa
          if (mediaType && c.media_type === mediaType) return true;
          if (!mediaType && content && c.content === content) return true;
          return false;
        });

        if (match) {
          // Atualiza a msg existente com o id e marca como entregue
          await supabase.from("chat_messages")
            .update({ whatsapp_message_id: messageId, status: "delivered" })
            .eq("id", match.id);
          alreadyExists = true;
        }
      }

      if (!alreadyExists) {
        const { error: msgErr } = await supabase.from("chat_messages").insert({
          conversation_id: convId,
          role: fromMe ? "assistant" : "user",
          direction: fromMe ? "outbound" : "inbound",
          content: finalContent,
          whatsapp_message_id: messageId,
          media_url: storedMediaUrl,
          media_type: mediaType,
          sender_name: name || null,
          status: "delivered",
          metadata: {
            ...(mediaFileName ? { file_name: mediaFileName, mime: mediaMime } : {}),
            ...(hasUtm ? { utm } : {}),
            ...(adReply || ctwaClid
              ? {
                  ad: {
                    title: adReply?.title ?? null,
                    body: adReply?.body ?? null,
                    source_url: adReply?.sourceUrl ?? null,
                    source_id: adReply?.sourceId ?? null,
                    source_type: adReply?.sourceType ?? null,
                    ctwa_clid: ctwaClid ?? null,
                  },
                }
              : {}),
          },
        });
        if (msgErr) console.error("[mega-webhook] msg err:", msgErr);
      } else {
        console.log("[mega-webhook] eco do envio próprio — não duplicado");
      }
    }

    if (leadId) {
      await supabase.from("leads").update({ last_interaction: new Date().toISOString() }).eq("id", leadId);
    }

    return json({ ok: true, lead_id: leadId, conversation_id: convId, media_url: storedMediaUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[mega-webhook] error:", msg);
    return json({ ok: false, error: msg }, 500);
  }
});

// Recebe áudio (base64) e retorna transcrição usando um gateway de IA compatível com a API da OpenAI.
// Padrão: Google Gemini (endpoint compatível). Configure AI_API_KEY e, se quiser, AI_GATEWAY_URL / AI_TRANSCRIBE_MODEL.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audio, mimeType } = await req.json();
    if (!audio) throw new Error("Áudio não enviado");

    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) throw new Error("AI_API_KEY ausente");
    const AI_GATEWAY_URL = Deno.env.get("AI_GATEWAY_URL") ?? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const AI_MODEL = Deno.env.get("AI_TRANSCRIBE_MODEL") ?? Deno.env.get("AI_MODEL") ?? "gemini-2.5-flash";

    // Formato esperado pelo gateway (openai-compatible audio in user content)
    // Para Gemini, usamos input_audio com format derivado do mimetype.
    const fmt = (mimeType || "audio/webm").includes("mp3") ? "mp3"
      : (mimeType || "audio/webm").includes("wav") ? "wav"
      : "webm";

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "input_audio", input_audio: { data: audio, format: fmt } },
              { type: "text", text: "Transcreva o áudio em português brasileiro EXATAMENTE como falado. Retorne apenas o texto transcrito, sem comentários, sem aspas, sem prefixo." },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Transcribe error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Falha ao transcrever");
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[transcribe-audio]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
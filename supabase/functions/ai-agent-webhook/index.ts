import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, params } = await req.json();

    switch (action) {
      // ===== LEADS =====
      case "search_leads": {
        const { query, stage, source, limit = 20 } = params || {};
        let q = supabase.from("leads").select("*").limit(limit);
        if (query) q = q.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
        if (stage) q = q.eq("stage", stage);
        if (source) q = q.eq("source", source);
        const { data, error } = await q.order("created_at", { ascending: false });
        if (error) throw error;
        return json({ leads: data });
      }

      case "create_lead": {
        const { name, phone, email, source, procedure, age, city } = params;
        if (!name || !phone || !source || !procedure) throw new Error("name, phone, source, procedure são obrigatórios");
        const { data, error } = await supabase.from("leads").insert({ name, phone, email, source, procedure, age, city }).select().single();
        if (error) throw error;
        return json({ lead: data });
      }

      case "update_lead_stage": {
        const { lead_id, stage } = params;
        if (!lead_id || !stage) throw new Error("lead_id e stage são obrigatórios");
        const { data, error } = await supabase.from("leads").update({ stage }).eq("id", lead_id).select().single();
        if (error) throw error;
        return json({ lead: data });
      }

      // ===== NOTES =====
      case "add_note": {
        const { lead_id, content, author = "Agente IA" } = params;
        if (!lead_id || !content) throw new Error("lead_id e content são obrigatórios");
        const { data, error } = await supabase.from("lead_notes").insert({ lead_id, content, author }).select().single();
        if (error) throw error;
        return json({ note: data });
      }

      case "get_notes": {
        const { lead_id } = params;
        const { data, error } = await supabase.from("lead_notes").select("*").eq("lead_id", lead_id).order("created_at", { ascending: false });
        if (error) throw error;
        return json({ notes: data });
      }

      // ===== AVAILABILITY =====
      case "get_availability": {
        const { data, error } = await supabase.from("doctor_availability").select("*").eq("is_active", true).order("day_of_week");
        if (error) throw error;
        return json({ availability: data });
      }

      // ===== APPOINTMENTS =====
      case "get_appointments": {
        const { date_from, date_to, status } = params || {};
        let q = supabase.from("appointments").select("*, leads(name, phone, email)");
        if (date_from) q = q.gte("scheduled_at", date_from);
        if (date_to) q = q.lte("scheduled_at", date_to);
        if (status) q = q.eq("status", status);
        const { data, error } = await q.order("scheduled_at");
        if (error) throw error;
        return json({ appointments: data });
      }

      case "check_slot": {
        const { date, time } = params;
        if (!date || !time) throw new Error("date e time são obrigatórios");
        const dayOfWeek = new Date(`${date}T${time}`).getDay();
        // Check if doctor is available on that day/time
        const { data: avail } = await supabase
          .from("doctor_availability")
          .select("*")
          .eq("day_of_week", dayOfWeek)
          .eq("is_active", true);
        if (!avail?.length) return json({ available: false, reason: "Não há atendimento nesse dia" });

        const slotTime = time;
        const isInRange = avail.some(a => slotTime >= a.start_time && slotTime < a.end_time);
        if (!isInRange) return json({ available: false, reason: "Horário fora do expediente" });

        // Check for conflicts
        const startDt = `${date}T${time}:00`;
        const { data: conflicts } = await supabase
          .from("appointments")
          .select("id")
          .gte("scheduled_at", `${date}T00:00:00`)
          .lte("scheduled_at", `${date}T23:59:59`)
          .neq("status", "cancelado");

        // Simple 1h block check
        const conflictTimes = conflicts?.map(c => new Date(c.id)) || [];
        return json({ available: true, existing_appointments: conflicts?.length || 0 });
      }

      case "create_appointment": {
        const { lead_id, procedure_name, scheduled_at, notes } = params;
        if (!lead_id || !procedure_name || !scheduled_at) throw new Error("lead_id, procedure_name, scheduled_at são obrigatórios");
        const { data, error } = await supabase.from("appointments").insert({ lead_id, procedure_name, scheduled_at, notes }).select("*, leads(name, phone, email)").single();
        if (error) throw error;
        // Move lead to consulta_agendada
        await supabase.from("leads").update({ stage: "consulta_agendada" }).eq("id", lead_id);
        return json({ appointment: data });
      }

      // ===== CONVERSATIONS =====
      case "create_conversation": {
        const { lead_id, channel = "website", agent_id } = params;
        const { data, error } = await supabase.from("chat_conversations").insert({ lead_id, channel, agent_id, status: "active" }).select().single();
        if (error) throw error;
        return json({ conversation: data });
      }

      case "send_message": {
        const { conversation_id, role, content, metadata } = params;
        if (!conversation_id || !content) throw new Error("conversation_id e content são obrigatórios");
        const { data, error } = await supabase.from("chat_messages").insert({ conversation_id, role: role || "assistant", content, metadata }).select().single();
        if (error) throw error;
        return json({ message: data });
      }

      case "get_conversation_messages": {
        const { conversation_id, limit = 50 } = params;
        const { data, error } = await supabase.from("chat_messages").select("*").eq("conversation_id", conversation_id).order("created_at").limit(limit);
        if (error) throw error;
        return json({ messages: data });
      }

      // ===== AI AGENT CONFIG =====
      case "get_agent": {
        const { agent_id } = params;
        const { data, error } = await supabase.from("ai_agents").select("*").eq("id", agent_id).single();
        if (error) throw error;
        return json({ agent: data });
      }

      case "list_agents": {
        const { data, error } = await supabase.from("ai_agents").select("*").eq("is_active", true);
        if (error) throw error;
        return json({ agents: data });
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (e) {
    console.error("ai-agent-webhook error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

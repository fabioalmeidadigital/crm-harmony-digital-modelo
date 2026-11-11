import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, ...params } = await req.json();

    // Get Google credentials from integration_settings
    const getGoogleTokens = async () => {
      const { data: settings } = await supabase
        .from("integration_settings")
        .select("key, value")
        .in("key", ["google_access_token", "google_refresh_token", "google_calendar_id", "google_client_id", "google_client_secret"]);

      const map: Record<string, string> = {};
      settings?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    };

    const refreshAccessToken = async (settings: Record<string, string>) => {
      const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: settings.google_client_id,
          client_secret: settings.google_client_secret,
          refresh_token: settings.google_refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const data = await resp.json();
      if (data.access_token) {
        await supabase.from("integration_settings").upsert(
          { key: "google_access_token", value: data.access_token, description: "Google OAuth access token" },
          { onConflict: "key" }
        );
        return data.access_token;
      }
      throw new Error("Failed to refresh Google token: " + JSON.stringify(data));
    };

    const googleFetch = async (url: string, options: RequestInit = {}) => {
      const settings = await getGoogleTokens();
      if (!settings.google_access_token || !settings.google_refresh_token) {
        throw new Error("Google Calendar não conectado. Configure as credenciais primeiro.");
      }

      let token = settings.google_access_token;
      let resp = await fetch(url, {
        ...options,
        headers: { ...options.headers as any, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      // If token expired, refresh and retry
      if (resp.status === 401) {
        token = await refreshAccessToken(settings);
        resp = await fetch(url, {
          ...options,
          headers: { ...options.headers as any, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      }

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Google API error [${resp.status}]: ${errBody}`);
      }
      return resp.json();
    };

    const getCalendarId = async () => {
      const settings = await getGoogleTokens();
      return settings.google_calendar_id || "primary";
    };

    switch (action) {
      // Check connection status
      case "status": {
        const settings = await getGoogleTokens();
        const connected = !!(settings.google_access_token && settings.google_refresh_token);
        let calendarName = null;
        if (connected) {
          try {
            const calId = settings.google_calendar_id || "primary";
            const cal = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}`);
            calendarName = cal.summary;
          } catch { /* not connected properly */ }
        }
        return new Response(JSON.stringify({ connected, calendarName, calendarId: settings.google_calendar_id || "primary" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create event in Google Calendar
      case "create_event": {
        const { appointment_id } = params;
        const { data: apt } = await supabase
          .from("appointments")
          .select("*, leads(name, phone, email)")
          .eq("id", appointment_id)
          .single();

        if (!apt) throw new Error("Agendamento não encontrado");

        const calId = await getCalendarId();
        const startDate = new Date(apt.scheduled_at);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default

        const event = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`, {
          method: "POST",
          body: JSON.stringify({
            summary: `${apt.procedure_name} - ${apt.leads?.name || "Paciente"}`,
            description: `Procedimento: ${apt.procedure_name}\nPaciente: ${apt.leads?.name}\nTelefone: ${apt.leads?.phone}\n${apt.notes ? "Obs: " + apt.notes : ""}`,
            start: { dateTime: startDate.toISOString(), timeZone: "America/Sao_Paulo" },
            end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
            reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }] },
          }),
        });

        // Save Google event ID
        await supabase.from("appointments").update({ google_calendar_event_id: event.id }).eq("id", appointment_id);

        return new Response(JSON.stringify({ success: true, eventId: event.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete event from Google Calendar
      case "delete_event": {
        const { appointment_id: aptId } = params;
        const { data: apt2 } = await supabase
          .from("appointments")
          .select("google_calendar_event_id")
          .eq("id", aptId)
          .single();

        if (apt2?.google_calendar_event_id) {
          const calId = await getCalendarId();
          await googleFetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${apt2.google_calendar_event_id}`,
            { method: "DELETE" }
          ).catch(() => {}); // ignore if already deleted
          await supabase.from("appointments").update({ google_calendar_event_id: null }).eq("id", aptId);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Sync all unsynchronized appointments to Google Calendar
      case "sync_all": {
        const { data: unsyncedApts } = await supabase
          .from("appointments")
          .select("*, leads(name, phone, email)")
          .is("google_calendar_event_id", null)
          .in("status", ["pendente", "confirmado"]);

        const calId = await getCalendarId();
        let synced = 0;

        for (const apt of unsyncedApts || []) {
          try {
            const startDate = new Date(apt.scheduled_at);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

            const event = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`, {
              method: "POST",
              body: JSON.stringify({
                summary: `${apt.procedure_name} - ${(apt as any).leads?.name || "Paciente"}`,
                description: `Procedimento: ${apt.procedure_name}\nPaciente: ${(apt as any).leads?.name}\nTelefone: ${(apt as any).leads?.phone}`,
                start: { dateTime: startDate.toISOString(), timeZone: "America/Sao_Paulo" },
                end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
              }),
            });

            await supabase.from("appointments").update({ google_calendar_event_id: event.id }).eq("id", apt.id);
            synced++;
          } catch (e) {
            console.error(`Failed to sync appointment ${apt.id}:`, e);
          }
        }

        return new Response(JSON.stringify({ success: true, synced, total: unsyncedApts?.length || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Import events from Google Calendar
      case "import_events": {
        const { timeMin, timeMax } = params;
        const calId = await getCalendarId();
        const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`);
        if (timeMin) url.searchParams.set("timeMin", timeMin);
        if (timeMax) url.searchParams.set("timeMax", timeMax);
        url.searchParams.set("singleEvents", "true");
        url.searchParams.set("orderBy", "startTime");
        url.searchParams.set("maxResults", "100");

        const result = await googleFetch(url.toString());
        return new Response(JSON.stringify({ events: result.items || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save OAuth tokens after authorization
      case "save_tokens": {
        const { code, client_id, client_secret, redirect_uri } = params;

        // Exchange authorization code for tokens
        const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id,
            client_secret,
            redirect_uri,
            grant_type: "authorization_code",
          }),
        });
        const tokens = await tokenResp.json();
        if (!tokens.access_token) throw new Error("Failed to get tokens: " + JSON.stringify(tokens));

        // Save all tokens
        const upserts = [
          { key: "google_client_id", value: client_id, description: "Google OAuth Client ID" },
          { key: "google_client_secret", value: client_secret, description: "Google OAuth Client Secret" },
          { key: "google_access_token", value: tokens.access_token, description: "Google OAuth access token" },
        ];
        if (tokens.refresh_token) {
          upserts.push({ key: "google_refresh_token", value: tokens.refresh_token, description: "Google OAuth refresh token" });
        }

        for (const item of upserts) {
          await supabase.from("integration_settings").upsert(item, { onConflict: "key" });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save calendar ID preference
      case "set_calendar_id": {
        const { calendar_id } = params;
        await supabase.from("integration_settings").upsert(
          { key: "google_calendar_id", value: calendar_id, description: "ID do Google Calendar selecionado" },
          { onConflict: "key" }
        );
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // List available calendars
      case "list_calendars": {
        const calendars = await googleFetch("https://www.googleapis.com/calendar/v3/users/me/calendarList");
        return new Response(JSON.stringify({ calendars: calendars.items || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Ação desconhecida: " + action }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: any) {
    console.error("Google Calendar sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

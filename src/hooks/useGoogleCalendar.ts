import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function callGoogleCalendar(action: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useGoogleCalendarStatus() {
  return useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: () => callGoogleCalendar("status"),
    refetchInterval: false,
    retry: false,
  });
}

export function useSyncToGoogleCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => callGoogleCalendar("create_event", { appointment_id: appointmentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Evento criado no Google Agenda!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSyncAllToGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => callGoogleCalendar("sync_all"),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(`${data.synced} de ${data.total} agendamentos sincronizados!`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteGoogleEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => callGoogleCalendar("delete_event", { appointment_id: appointmentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useSaveGoogleTokens() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { code: string; client_id: string; client_secret: string; redirect_uri: string }) =>
      callGoogleCalendar("save_tokens", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
      toast.success("Google Agenda conectado com sucesso!");
    },
    onError: (e: Error) => toast.error("Erro ao conectar: " + e.message),
  });
}

export function useListGoogleCalendars() {
  return useQuery({
    queryKey: ["google-calendars-list"],
    queryFn: () => callGoogleCalendar("list_calendars"),
    enabled: false, // manual trigger
  });
}

export function useSetCalendarId() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (calendarId: string) => callGoogleCalendar("set_calendar_id", { calendar_id: calendarId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-calendar-status"] });
      toast.success("Calendário atualizado!");
    },
  });
}

export function getGoogleAuthUrl(clientId: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

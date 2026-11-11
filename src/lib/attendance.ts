import type { PipelineStage } from "./constants";

export const ATTENDANCE_STATUSES = [
  { id: "Agendada", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", chart: "hsl(152 60% 40%)" },
  { id: "Negociação", cls: "bg-amber-400/20 text-amber-700 dark:text-amber-300", chart: "hsl(40 90% 50%)" },
  { id: "Sem resposta", cls: "bg-muted text-muted-foreground", chart: "hsl(220 10% 60%)" },
  { id: "Perda", cls: "bg-destructive/15 text-destructive", chart: "hsl(0 75% 55%)" },
  { id: "Interesse Futuro", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300", chart: "hsl(200 80% 50%)" },
  { id: "Cancelou", cls: "bg-destructive/10 text-destructive", chart: "hsl(0 40% 45%)" },
] as const;

export const STATUS_TO_STAGE: Record<string, PipelineStage> = {
  "Agendada": "consulta_agendada",
  "Negociação": "contato_feito",
  "Perda": "nao_fechou",
  "Cancelou": "nao_fechou",
  "Sem resposta": "contato_feito",
  "Interesse Futuro": "lista_espera",
};

export const SHEET_SOURCES = ["Instagram", "Facebook", "Meta Ads", "Site", "CRM", "Google", "WhatsApp", "Indicação", "Indicação Paciente", "Indicação médica", "Paciente", "Recaptação", "Equipe", "Store", "Revendedor", "Plano", "Não informado"];
export const INSURANCES = ["Particular", "Amil", "Sul America", "MedSênior", "GEAP", "Outro"];
export const MODALITIES = ["Presencial", "Online"];
export const TEMPERATURES = ["QUENTE", "MORNO", "FRIO"];
export const CONTACT_REASONS = ["Cirurgia Mama", "Cirurgia Corporal", "Cirurgia Facial", "Cirurgia Mohs", "Reconstrução de mama", "Explante", "Troca de protese", "Reparadora", "Abdominoplastia", "Lipo", "Botox", "Proced Estético", "Ninfoplastia", "Não informado"];

export const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function leadContactDate(l: { first_contact_date?: string | null; created_at: string }) {
  return l.first_contact_date ? new Date(l.first_contact_date + "T12:00:00") : new Date(l.created_at);
}

export function statusClass(s?: string | null) {
  return ATTENDANCE_STATUSES.find(x => x.id === s)?.cls || "";
}

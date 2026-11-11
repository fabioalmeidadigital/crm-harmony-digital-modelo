// ===== PIPE 1 — Funil de Leads =====
export const PIPE1_STAGES = [
  { id: "novo_lead", label: "Novo Lead", color: "bg-blue-lighter text-primary" },
  { id: "contato_feito", label: "Contato Feito", color: "bg-blue-100 text-blue-medium" },
  { id: "consulta_agendada", label: "Consulta Agendada", color: "bg-amber-100 text-amber-700" },
  { id: "lista_espera", label: "Lista de Espera (Antecipar)", color: "bg-cyan-100 text-cyan-700" },
  { id: "consulta_realizada", label: "Consulta Realizada", color: "bg-coral-lighter text-coral" },
] as const;

// ===== Motivos de desqualificação =====
export const DISQUALIFICATION_REASONS = [
  { id: "preco", label: "Preço / Não tem recursos financeiros" },
  { id: "regiao", label: "Não é da região" },
  { id: "nao_entendeu", label: "Não entendeu o serviço/proposta (outra função)" },
  { id: "convenio", label: "Não tem convênio atendido/aceito" },
  { id: "tempo_espera", label: "Não quer aguardar / tempo de espera" },
  { id: "sem_resposta", label: "Não respondeu" },
] as const;

export type DisqualificationReason = typeof DISQUALIFICATION_REASONS[number]["id"];

// ===== PIPE 2 — Funil de Vendas =====
export const PIPE2_STAGES = [
  { id: "plano_apresentado", label: "Plano Apresentado", color: "bg-indigo-100 text-indigo-700" },
  { id: "aguardando_decisao", label: "Aguardando Decisão", color: "bg-yellow-100 text-yellow-700" },
  { id: "procedimento_fechado", label: "Procedimento Fechado", color: "bg-emerald-100 text-emerald-700" },
  { id: "cirurgia_agendada", label: "Cirurgia Agendada", color: "bg-purple-100 text-purple-700" },
  { id: "cirurgia_realizada", label: "Cirurgia Realizada", color: "bg-green-100 text-green-700" },
  { id: "pos_procedimento", label: "Pós-Procedimento", color: "bg-teal-100 text-teal-700" },
] as const;

// ===== Etapas especiais =====
export const SPECIAL_STAGES = [
  { id: "fornecedor", label: "Fornecedor", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { id: "nao_fechou", label: "Não Fechou", color: "bg-red-100 text-red-700 border-red-300" },
  { id: "contato_inexistente", label: "Contato Inexistente", color: "bg-red-500 text-white border-red-600" },
] as const;

// All stages combined (for selectors, etc.)
export const PIPELINE_STAGES = [...PIPE1_STAGES, ...PIPE2_STAGES, ...SPECIAL_STAGES] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number]["id"];

// Legacy kept for compatibility
export const PIPE1_IDS = PIPE1_STAGES.map(s => s.id) as unknown as readonly string[];
export const PIPE2_IDS = PIPE2_STAGES.map(s => s.id) as unknown as readonly string[];

export const LEAD_SOURCES = [
  "Instagram Ads",
  "Google Ads",
  "Indicação",
  "Site",
  "Orgânico",
  "Evento",
  "Outro",
] as const;

export type LeadSource = typeof LEAD_SOURCES[number];

export const PROCEDURES = [
  "Mamoplastia",
  "Abdominoplastia",
  "Rinoplastia",
  "Lipoaspiração",
  "Blefaroplastia",
  "Lifting Facial",
  "Prótese de Glúteo",
  "Otoplastia",
  "Outro",
] as const;

export type Procedure = typeof PROCEDURES[number];

export const SOURCE_COLORS: Record<string, string> = {
  "Instagram Ads": "bg-pink-100 text-pink-700 border-pink-200",
  "Google Ads": "bg-blue-100 text-blue-700 border-blue-200",
  "Indicação": "bg-green-100 text-green-700 border-green-200",
  "Site": "bg-purple-100 text-purple-700 border-purple-200",
  "Orgânico": "bg-amber-100 text-amber-700 border-amber-200",
  "Evento": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Outro": "bg-gray-100 text-gray-700 border-gray-200",
};

// ===== Pagamento =====
export const PAYMENT_STATUSES = [
  { id: "pendente", label: "Pendente", color: "bg-gray-100 text-gray-700 border-gray-300" },
  { id: "parcial", label: "Parcial", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { id: "pago", label: "Pago", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { id: "isento", label: "Isento", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { id: "estornado", label: "Estornado", color: "bg-red-100 text-red-700 border-red-300" },
] as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[number]["id"];

export const PAYMENT_METHODS = [
  "Pix",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Dinheiro",
  "Transferência",
  "Boleto",
  "Financiamento",
  "Outro",
] as const;

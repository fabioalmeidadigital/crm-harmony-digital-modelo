import { useLeads } from "@/contexts/LeadsContext";
import { PIPELINE_STAGES, PIPE1_STAGES, PIPE2_STAGES, SPECIAL_STAGES, SOURCE_COLORS, PAYMENT_STATUSES, PAYMENT_METHODS, LEAD_SOURCES, DISQUALIFICATION_REASONS } from "@/lib/constants";
import type { PipelineStage } from "@/lib/constants";
import type { Lead } from "@/lib/types";
import { formatPhone, formatDateTime } from "@/lib/whatsapp";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar, ListChecks, CheckCircle2, DollarSign, Pencil, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LeadAttachments } from "@/components/LeadAttachments";
import { LeadAppointments } from "@/components/LeadAppointments";
import { LeadConversationsHistory } from "@/components/LeadConversationsHistory";
import { StartWhatsAppButton } from "@/components/inbox/StartWhatsAppButton";
import { usePipelineNextSteps } from "@/hooks/usePipelineNextSteps";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailDialog({ lead, open, onOpenChange }: LeadDetailDialogProps) {
  const { moveLead, addNote, getLeadNotes, updateLead } = useLeads();
  const [noteContent, setNoteContent] = useState("");
  const { steps } = usePipelineNextSteps(lead?.stage);

  const { data: procedureList = [] } = useQuery({
    queryKey: ["procedures-payment"],
    queryFn: async () => {
      const { data } = await supabase.from("procedures").select("name").order("name");
      return (data || []).map(d => d.name);
    },
  });

  const { data: sourceList = [] } = useQuery({
    queryKey: ["lead-sources-dialog"],
    queryFn: async () => {
      const { data } = await supabase.from("lead_sources").select("name").order("name");
      const fromDb = (data || []).map(d => d.name);
      return fromDb.length ? fromDb : [...LEAD_SOURCES];
    },
  });

  const releasePageLock = useCallback(() => {
    document.body.style.pointerEvents = "";
  }, []);

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(releasePageLock, 250);
    return () => window.clearTimeout(timer);
  }, [open, releasePageLock]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) window.setTimeout(releasePageLock, 250);
  };

  const notes = lead ? getLeadNotes(lead.id) : [];
  const currentStage = lead ? PIPELINE_STAGES.find(s => s.id === lead.stage) : undefined;
  const paymentStatus = lead ? PAYMENT_STATUSES.find(s => s.id === (lead.payment_status || "pendente")) : undefined;

  const handleAddNote = () => {
    if (!lead || !noteContent.trim()) return;
    addNote(lead.id, noteContent.trim(), "Equipe");
    setNoteContent("");
    toast.success("Nota adicionada!");
  };

  const handleSelectNextStep = (stepTitle: string) => {
    if (!lead) return;
    updateLead(lead.id, { next_step: stepTitle });
    toast.success("Próxima etapa definida!");
  };

  const handleClearNextStep = () => {
    if (!lead) return;
    updateLead(lead.id, { next_step: null as any });
    toast.success("Próxima etapa removida!");
  };

  const handleFieldBlur = (field: keyof Lead, value: any) => {
    if (!lead) return;
    const current = (lead as any)[field] ?? "";
    const normalized = value === "" ? null : value;
    if (normalized === current || (normalized == null && !current)) return;
    updateLead(lead.id, { [field]: normalized } as any);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          releasePageLock();
        }}
      >
        {!lead ? null : (
        <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-lg">{lead.name}</span>
            <Badge variant="outline" className={SOURCE_COLORS[lead.source] || ""}>
              {lead.source}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cadastro editável */}
          <div className="rounded-lg border p-3 bg-secondary/30">
            <div className="flex items-center gap-2 mb-3">
              <Pencil className="h-4 w-4 text-accent" />
              <label className="text-xs font-semibold text-foreground">Cadastro do Lead</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground">Nome</label>
                <Input
                  className="h-8 text-xs"
                  defaultValue={lead.name ?? ""}
                  key={`name-${lead.id}`}
                  onBlur={e => handleFieldBlur("name", e.target.value.trim())}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Telefone (WhatsApp)</label>
                <Input
                  className="h-8 text-xs"
                  defaultValue={lead.phone ?? ""}
                  key={`phone-${lead.id}`}
                  onBlur={e => handleFieldBlur("phone", e.target.value.trim())}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Email</label>
                <Input
                  type="email"
                  className="h-8 text-xs"
                  defaultValue={lead.email ?? ""}
                  key={`email-${lead.id}`}
                  onBlur={e => handleFieldBlur("email", e.target.value.trim())}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Cidade</label>
                <Input
                  className="h-8 text-xs"
                  defaultValue={lead.city ?? ""}
                  key={`city-${lead.id}`}
                  onBlur={e => handleFieldBlur("city", e.target.value.trim())}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Idade</label>
                <Input
                  type="number"
                  min={0}
                  className="h-8 text-xs"
                  defaultValue={lead.age ?? ""}
                  key={`age-${lead.id}`}
                  onBlur={e => {
                    const v = e.target.value ? parseInt(e.target.value, 10) : null;
                    handleFieldBlur("age", v);
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Origem</label>
                <Select
                  value={lead.source || ""}
                  onValueChange={v => updateLead(lead.id, { source: v as any })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {sourceList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Procedimento de Interesse</label>
                <Select
                  value={lead.procedure || ""}
                  onValueChange={v => updateLead(lead.id, { procedure: v as any })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {procedureList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground mt-3 pt-3 border-t">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0" />
                <span>Criado: {formatDateTime(lead.created_at)}</span>
              </div>
              {lead.last_interaction && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>Última: {formatDateTime(lead.last_interaction)}</span>
                </div>
              )}
            </div>

            {(lead.utm_source || lead.utm_medium || lead.utm_campaign || lead.utm_term ||
              lead.utm_content || lead.ad_headline || lead.ad_id || lead.ctwa_clid ||
              lead.referrer || lead.landing_page) && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Rastreamento de origem
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  {[
                    ["Fonte (utm_source)", lead.utm_source],
                    ["Mídia (utm_medium)", lead.utm_medium],
                    ["Campanha", lead.utm_campaign],
                    ["Palavra-chave", lead.utm_term],
                    ["Anúncio (utm_content)", lead.utm_content],
                    ["Título do anúncio", lead.ad_headline],
                    ["ID do anúncio", lead.ad_id],
                    ["ID do clique", lead.ctwa_clid],
                    ["Referência", lead.referrer],
                    ["Página de entrada", lead.landing_page],
                  ]
                    .filter(([, v]) => !!v)
                    .map(([label, value]) => (
                      <div key={label as string} className="min-w-0">
                        <span className="text-muted-foreground">{label}: </span>
                        <span className="font-mono break-all">{value as string}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Pagamento */}
          {(lead.form_incomodo || lead.form_tempo || lead.form_motivacao) && (
            <>
              <div className="rounded-lg border p-3 bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <ListChecks className="h-4 w-4 text-accent" />
                  <label className="text-xs font-semibold text-foreground">Respostas do Formulário</label>
                </div>
                <div className="space-y-2 text-xs">
                  {lead.form_incomodo && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">O que mais tem te incomodado no corpo?</p>
                      <p className="text-foreground">{lead.form_incomodo.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {lead.form_tempo && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Há quanto tempo sente esse incômodo?</p>
                      <p className="text-foreground">{lead.form_tempo.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {lead.form_motivacao && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">O que te motivou a buscar essa transformação agora?</p>
                      <p className="text-foreground">{lead.form_motivacao.replace(/_/g, " ")}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          <div className="rounded-lg border p-3 bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                <label className="text-xs font-semibold text-foreground">Pagamento</label>
              </div>
              <Badge variant="outline" className={`text-[10px] ${paymentStatus?.color || ""}`}>
                {paymentStatus?.label || "Pendente"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Status</label>
                <Select
                  value={lead.payment_status || "pendente"}
                  onValueChange={v => {
                    const updates: any = { payment_status: v };
                    if (v === "pago" && !lead.payment_date) updates.payment_date = new Date().toISOString();
                    if (v === "pago" && !lead.payment_procedure) updates.payment_procedure = lead.procedure;
                    updateLead(lead.id, updates);
                    toast.success("Pagamento atualizado!");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Valor (R$)</label>
                <Input
                  type="number" step="0.01" min="0"
                  className="h-8 text-xs"
                  defaultValue={lead.payment_amount ?? ""}
                  onBlur={e => {
                    const v = e.target.value ? parseFloat(e.target.value) : null;
                    if (v !== (lead.payment_amount ?? null)) {
                      updateLead(lead.id, { payment_amount: v as any });
                    }
                  }}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground">Procedimento Pago</label>
                <Select
                  value={lead.payment_procedure || ""}
                  onValueChange={v => updateLead(lead.id, { payment_procedure: v as any })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o procedimento" /></SelectTrigger>
                  <SelectContent>
                    {procedureList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Forma</label>
                <Select
                  value={lead.payment_method || ""}
                  onValueChange={v => updateLead(lead.id, { payment_method: v as any })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Data</label>
                <Input
                  type="datetime-local"
                  className="h-8 text-xs"
                  defaultValue={lead.payment_date ? new Date(lead.payment_date).toISOString().slice(0, 16) : ""}
                  onBlur={e => {
                    const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                    updateLead(lead.id, { payment_date: v as any });
                  }}
                />
              </div>
            </div>
            {lead.payment_notes && (
              <p className="text-[11px] text-muted-foreground mt-2 italic">"{lead.payment_notes}"</p>
            )}
          </div>

          <Separator />

          {/* Desqualificação */}
          <div className="rounded-lg border p-3 bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <label className="text-xs font-semibold text-foreground">Lead Desqualificado</label>
              </div>
              {lead.disqualification_reason && (
                <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300">
                  Desqualificado
                </Badge>
              )}
            </div>
            <label className="text-[10px] text-muted-foreground">Motivo da desqualificação</label>
            <Select
              value={lead.disqualification_reason || "none"}
              onValueChange={v => {
                if (v === "none") {
                  updateLead(lead.id, { disqualification_reason: null, disqualified_at: null } as any);
                  toast.success("Desqualificação removida!");
                  return;
                }
                updateLead(lead.id, {
                  disqualification_reason: v,
                  disqualified_at: lead.disqualified_at || new Date().toISOString(),
                } as any);
                toast.success("Motivo registrado!");
              }}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Não desqualificado —</SelectItem>
                {DISQUALIFICATION_REASONS.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lead.disqualified_at && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Registrado em {formatDateTime(lead.disqualified_at)}
              </p>
            )}
          </div>

          <Separator />

          {/* Procedimento & Etapa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Procedimento</label>
              <Badge className="bg-accent/10 text-accent border-accent/20">{lead.procedure}</Badge>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Etapa do Pipeline</label>
              <Select
                value={lead.stage}
                onValueChange={val => {
                  moveLead(lead.id, val as PipelineStage);
                  toast.success(`${lead.name} movido para ${PIPELINE_STAGES.find(s => s.id === val)?.label}`);
                }}
              >
                <SelectTrigger className={`h-8 text-xs font-medium ${currentStage?.color || ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">Funil de Leads</div>
                  {PIPE1_STAGES.map(s => <SelectItem key={s.id} value={s.id}><span className={`text-xs font-medium ${s.color}`}>{s.label}</span></SelectItem>)}
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground mt-1">Funil de Vendas</div>
                  {PIPE2_STAGES.map(s => <SelectItem key={s.id} value={s.id}><span className={`text-xs font-medium ${s.color}`}>{s.label}</span></SelectItem>)}
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground mt-1">Outros</div>
                  {SPECIAL_STAGES.map(s => <SelectItem key={s.id} value={s.id}><span className={`text-xs font-medium ${s.color}`}>{s.label}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Próxima Etapa */}
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks className="h-4 w-4 text-accent" />
              <label className="text-xs font-semibold text-foreground">Próxima Etapa</label>
            </div>
            {lead.next_step && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-md bg-accent/10 border border-accent/20">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1">{lead.next_step}</span>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-destructive" onClick={handleClearNextStep}>
                  Limpar
                </Button>
              </div>
            )}
            {steps.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground">Ações sugeridas para esta etapa:</p>
                {steps.map(step => (
                  <button
                    key={step.id}
                    className={`w-full text-left p-2 rounded-md border text-xs transition-colors ${
                      lead.next_step === step.title
                        ? "bg-accent/15 border-accent/30 text-foreground"
                        : "bg-card border-border hover:bg-secondary/50 text-foreground"
                    }`}
                    onClick={() => handleSelectNextStep(step.title)}
                  >
                    <span className="font-medium">{step.step_order}. {step.title}</span>
                    {step.description && (
                      <p className="text-muted-foreground mt-0.5">{step.description}</p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma ação sugerida para esta etapa.</p>
            )}
          </div>

          {/* WhatsApp */}
          <StartWhatsAppButton lead={lead} label="Iniciar conversa" className="w-full" onStarted={() => onOpenChange(false)} />

          <Separator />

          <LeadConversationsHistory leadId={lead.id} />

          <Separator />

          {/* Agendamentos */}
          <LeadAppointments leadId={lead.id} />

          <Separator />

          {/* Anexos */}
          <LeadAttachments leadId={lead.id} />

          <Separator />

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Notas</label>
            <div className="flex gap-2 mb-3">
              <Textarea
                placeholder="Adicionar uma nota..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
            <Button size="sm" onClick={handleAddNote} className="bg-accent hover:bg-accent/90 text-accent-foreground mb-3">
              Adicionar Nota
            </Button>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {notes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhuma nota ainda.</p>
              )}
              {notes.map(note => (
                <div key={note.id} className="p-2.5 rounded-lg bg-secondary/50 border-l-2 border-accent">
                  <p className="text-xs text-foreground">{note.content}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="font-medium">{note.author}</span>
                    <span>•</span>
                    <span>{formatDateTime(note.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}

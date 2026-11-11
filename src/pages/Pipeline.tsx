import { CRMLayout } from "@/components/CRMLayout";
import { useLeads } from "@/contexts/LeadsContext";
import { PIPE1_STAGES, PIPE2_STAGES, SPECIAL_STAGES, PIPELINE_STAGES, SOURCE_COLORS, PAYMENT_STATUSES } from "@/lib/constants";
import type { PipelineStage } from "@/lib/constants";
import type { Lead } from "@/lib/types";
import { timeAgo, isNewLead } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadDetailDialog } from "@/components/LeadDetailDialog";
import { ScheduleConsultaDialog } from "@/components/ScheduleConsultaDialog";
import { NewLeadBadge } from "@/components/NewLeadBadge";
import { GripVertical, Search, X, CalendarIcon, Filter, CheckCircle2, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StartWhatsAppButton } from "@/components/inbox/StartWhatsAppButton";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function Pipeline() {
  const { leads, moveLead } = useLeads();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState<{ lead: Lead } | null>(null);

  // ===== Filtros =====
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<string>("all");
  const [procedure, setProcedure] = useState<string>("all");
  const [dateField, setDateField] = useState<"created_at" | "updated_at" | "appointment">("created_at");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [hasAppointment, setHasAppointment] = useState<"all" | "with" | "without">("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [newOnly, setNewOnly] = useState(false);
  const [colLimit, setColLimit] = useState<Record<string, number>>({});

  const { data: sources = [] } = useQuery({
    queryKey: ["lead_sources"],
    queryFn: async () => {
      const { data } = await supabase.from("lead_sources").select("name").order("name");
      return (data || []).map(d => d.name);
    },
  });
  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures"],
    queryFn: async () => {
      const { data } = await supabase.from("procedures").select("name").order("name");
      return (data || []).map(d => d.name);
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments-pipeline-filter"],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("lead_id, scheduled_at, status");
      return data || [];
    },
  });

  const apptsByLead = useMemo(() => {
    const map = new Map<string, { scheduled_at: string; status: string }[]>();
    appointments.forEach(a => {
      const arr = map.get(a.lead_id) || [];
      arr.push({ scheduled_at: a.scheduled_at, status: a.status });
      map.set(a.lead_id, arr);
    });
    return map;
  }, [appointments]);

  const filteredLeads = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate(), 0, 0, 0).getTime() : null;
    const toTs = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59).getTime() : null;
    const q = search.trim().toLowerCase();

    return leads.filter(lead => {
      if (q) {
        const hay = `${lead.name} ${lead.phone} ${lead.email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (source !== "all" && lead.source !== source) return false;
      if (procedure !== "all" && lead.procedure !== procedure) return false;

      const leadAppts = apptsByLead.get(lead.id) || [];
      if (hasAppointment === "with" && leadAppts.length === 0) return false;
      if (hasAppointment === "without" && leadAppts.length > 0) return false;

      if (paymentFilter !== "all") {
        const ps = lead.payment_status || "pendente";
        if (paymentFilter === "any_paid") {
          if (ps !== "pago" && ps !== "parcial") return false;
        } else if (ps !== paymentFilter) {
          return false;
        }
      }

      if (newOnly && !isNewLead(lead.created_at)) return false;

      if (fromTs || toTs) {
        let candidates: number[] = [];
        if (dateField === "appointment") {
          candidates = leadAppts.map(a => new Date(a.scheduled_at).getTime());
          if (candidates.length === 0) return false;
        } else {
          candidates = [new Date(lead[dateField]).getTime()];
        }
        const inRange = candidates.some(ts =>
          (fromTs === null || ts >= fromTs) && (toTs === null || ts <= toTs)
        );
        if (!inRange) return false;
      }
      return true;
    });
  }, [leads, search, source, procedure, dateField, dateFrom, dateTo, hasAppointment, paymentFilter, newOnly, apptsByLead]);

  const activeFilterCount = [
    search.trim() !== "",
    source !== "all",
    procedure !== "all",
    !!dateFrom || !!dateTo,
    hasAppointment !== "all",
    paymentFilter !== "all",
    newOnly,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(""); setSource("all"); setProcedure("all");
    setDateField("created_at"); setDateFrom(undefined); setDateTo(undefined);
    setHasAppointment("all"); setPaymentFilter("all"); setNewOnly(false);
  };

  const handleDragStart = (leadId: string) => setDraggedLead(leadId);
  const handleDrop = (stage: PipelineStage) => {
    if (!draggedLead) return;
    if (stage === "consulta_agendada") {
      const lead = filteredLeads.find(l => l.id === draggedLead);
      if (lead && lead.stage !== "consulta_agendada") {
        setScheduleDialog({ lead });
        setDraggedLead(null);
        return;
      }
    }
    moveLead(draggedLead, stage);
    setDraggedLead(null);
  };

  const handleStageChange = (lead: Lead, newStage: PipelineStage) => {
    if (newStage === "consulta_agendada" && lead.stage !== "consulta_agendada") {
      setScheduleDialog({ lead });
      return;
    }
    moveLead(lead.id, newStage);
    toast.success(`${lead.name} movido para ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`);
  };

  const renderColumns = (stages: readonly { id: string; label: string; color: string }[], isSpecial = false) => (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-14rem)]">
      {stages.map(stage => {
        const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
        const isFornecedor = stage.id === "fornecedor";
        const isInexistente = stage.id === "contato_inexistente";
        return (
          <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col"
            onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(stage.id as PipelineStage)}>
            <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg ${isFornecedor ? "bg-orange-100 border border-orange-300" : isInexistente ? "bg-red-500 border border-red-600" : ""}`}>
              <h3 className={`text-sm font-semibold ${isFornecedor ? "text-orange-700" : isInexistente ? "text-white" : "text-foreground"}`}>{stage.label}</h3>
              <Badge variant="secondary" className={`text-xs ${isFornecedor ? "bg-orange-200 text-orange-800" : isInexistente ? "bg-red-700 text-white" : ""}`}>{stageLeads.length}</Badge>
            </div>
            <div className={`flex-1 space-y-2 p-2 rounded-xl min-h-[200px] ${isFornecedor ? "bg-orange-50 border border-orange-200" : isInexistente ? "bg-red-100 border border-red-300" : "bg-secondary/40"}`}>
              {stageLeads.slice(0, colLimit[stage.id] ?? 30).map(lead => (
                <LeadCard key={lead.id} lead={lead} onDragStart={handleDragStart} onSelect={(l) => { setSelectedLead(l); setDetailOpen(true); }} onStageChange={handleStageChange} />
              ))}
              {stageLeads.length > (colLimit[stage.id] ?? 30) && (
                <button className="w-full text-xs font-medium text-accent hover:underline py-2"
                  onClick={() => setColLimit(p => ({ ...p, [stage.id]: (p[stage.id] ?? 30) + 50 }))}>
                  Mostrar mais ({stageLeads.length - (colLimit[stage.id] ?? 30)})
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <CRMLayout title="Pipeline">
      {/* Barra de Filtros */}
      <div className="bg-card border rounded-xl p-3 mb-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Filter className="h-4 w-4 text-accent" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeFilterCount}</Badge>
            )}
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone, email..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Origem:</span>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Procedimento:</span>
            <Select value={procedure} onValueChange={setProcedure}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Procedimento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos procedimentos</SelectItem>
                {procedures.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Agendamento:</span>
            <Select value={hasAppointment} onValueChange={(v: any) => setHasAppointment(v)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with">Com agendamento</SelectItem>
                <SelectItem value="without">Sem agendamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Pagamento:</span>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Pagamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="any_paid">✅ Pago ou Parcial</SelectItem>
                {PAYMENT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={newOnly ? "default" : "outline"}
            size="sm"
            className={`h-8 text-xs gap-1 ${newOnly ? "bg-coral hover:bg-coral/90 text-white border-coral" : ""}`}
            onClick={() => setNewOnly(v => !v)}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${newOnly ? "bg-white" : "bg-coral"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${newOnly ? "bg-white" : "bg-coral"}`} />
            </span>
            Novos leads
          </Button>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Período por:</span>
          <Select value={dateField} onValueChange={(v: any) => setDateField(v)}>
            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Data de criação</SelectItem>
              <SelectItem value="updated_at">Última atualização</SelectItem>
              <SelectItem value="appointment">Data de agendamento</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm"
                className={cn("h-8 text-xs gap-1.5 font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom}
                locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>

          <span className="text-xs text-muted-foreground">até</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm"
                className={cn("h-8 text-xs gap-1.5 font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo}
                locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>

          {/* Atalhos rápidos */}
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]"
              onClick={() => { const t = new Date(); setDateFrom(t); setDateTo(t); }}>Hoje</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]"
              onClick={() => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 6); setDateFrom(f); setDateTo(t); }}>7 dias</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]"
              onClick={() => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 29); setDateFrom(f); setDateTo(t); }}>30 dias</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]"
              onClick={() => { const t = new Date(); const f = new Date(t.getFullYear(), t.getMonth(), 1); setDateFrom(f); setDateTo(t); }}>Este mês</Button>
          </div>

          <span className="text-xs text-muted-foreground ml-auto">
            {filteredLeads.length} de {leads.length} leads
          </span>
        </div>
      </div>

      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList className="bg-card border">
          <TabsTrigger value="todos">📋 Todos</TabsTrigger>
          <TabsTrigger value="leads">🎯 Funil de Leads</TabsTrigger>
          <TabsTrigger value="vendas">💼 Funil de Vendas</TabsTrigger>
          <TabsTrigger value="fornecedor">📦 Fornecedores</TabsTrigger>
        </TabsList>
        <TabsContent value="todos">{renderColumns(PIPELINE_STAGES)}</TabsContent>
        <TabsContent value="leads">{renderColumns(PIPE1_STAGES)}</TabsContent>
        <TabsContent value="vendas">{renderColumns(PIPE2_STAGES)}</TabsContent>
        <TabsContent value="fornecedor">{renderColumns(SPECIAL_STAGES, true)}</TabsContent>
      </Tabs>
      <LeadDetailDialog
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (open) return;
          setSelectedLead(null);
        }}
      />
      {scheduleDialog && (
        <ScheduleConsultaDialog
          open={true}
          onOpenChange={(open) => { if (!open) setScheduleDialog(null); }}
          leadId={scheduleDialog.lead.id}
          leadName={scheduleDialog.lead.name}
          procedure={scheduleDialog.lead.procedure}
          onConfirm={() => {
            moveLead(scheduleDialog.lead.id, "consulta_agendada");
            toast.success(`${scheduleDialog.lead.name} movido para Consulta Agendada com agendamento!`);
            setScheduleDialog(null);
          }}
        />
      )}
    </CRMLayout>
  );
}

function LeadCard({ lead, onDragStart, onSelect, onStageChange }: { 
  lead: Lead; 
  onDragStart: (id: string) => void; 
  onSelect: (lead: Lead) => void;
  onStageChange: (lead: Lead, stage: PipelineStage) => void;
}) {
  const currentStage = PIPELINE_STAGES.find(s => s.id === lead.stage);
  const ps = lead.payment_status || "pendente";
  const paymentInfo = PAYMENT_STATUSES.find(p => p.id === ps);
  const isPaid = ps === "pago";
  const isPartial = ps === "parcial";

  return (
    <div draggable onDragStart={() => onDragStart(lead.id)} onClick={() => onSelect(lead)}
      className={`bg-card rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative ${
        isPaid ? "border-l-4 border-l-emerald-500 bg-emerald-50/40" :
        isPartial ? "border-l-4 border-l-amber-500 bg-amber-50/40" : ""
      }`}>
      {isPaid && (
        <div className="absolute top-1.5 right-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-emerald-100" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
            {isNewLead(lead.created_at) && <NewLeadBadge />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{lead.procedure}</p>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
      </div>
      {(isPaid || isPartial) && (
        <div className={`mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold ${
          isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
        }`}>
          <DollarSign className="h-3 w-3" />
          <span>{paymentInfo?.label}</span>
          {lead.payment_amount != null && (
            <span className="ml-auto">R$ {Number(lead.payment_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          )}
        </div>
      )}
      {(isPaid || isPartial) && lead.payment_procedure && lead.payment_procedure !== lead.procedure && (
        <p className="text-[10px] text-muted-foreground mt-1 italic truncate">Pago: {lead.payment_procedure}</p>
      )}
      <div className="mt-2">
        <Select value={lead.stage} onValueChange={(val) => onStageChange(lead, val as PipelineStage)}>
          <SelectTrigger className={`h-6 text-[10px] font-medium w-full ${currentStage?.color || ""}`}
            onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
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
      {lead.next_step && (
        <div className="mt-2 px-2 py-1.5 rounded-md border border-border">
          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Próxima etapa:</p>
          <p className="text-[11px] text-foreground leading-tight">{lead.next_step}</p>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[lead.source] || ""}`}>{lead.source}</Badge>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo(lead.created_at)}</span>
          <StartWhatsAppButton lead={lead} label="Converse" size="sm" className="h-7 px-2 text-[10px]" />
        </div>
      </div>
    </div>
  );
}

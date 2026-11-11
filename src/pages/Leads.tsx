import { CRMLayout } from "@/components/CRMLayout";
import { useLeads } from "@/contexts/LeadsContext";
import type { PipelineStage } from "@/lib/constants";
import { PIPELINE_STAGES, PIPE1_STAGES, PIPE2_STAGES, SPECIAL_STAGES, LEAD_SOURCES, SOURCE_COLORS } from "@/lib/constants";
import { formatPhone, formatDate, isNewLead } from "@/lib/whatsapp";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadDetailDialog } from "@/components/LeadDetailDialog";
import { ScheduleConsultaDialog } from "@/components/ScheduleConsultaDialog";
import { NewLeadBadge } from "@/components/NewLeadBadge";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { StartWhatsAppButton } from "@/components/inbox/StartWhatsAppButton";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import type { Lead } from "@/lib/types";

type SortField = "name" | "procedure" | "created_at" | "source" | "stage";
type SortDir = "asc" | "desc";

export default function Leads() {
  const { leads, moveLead } = useLeads();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState<{ lead: Lead } | null>(null);
  const [visible, setVisible] = useState(100);

  const campaignOptions = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => { if (l.utm_campaign) set.add(l.utm_campaign); });
    return Array.from(set).sort();
  }, [leads]);

  const handleStageChange = (lead: Lead, newStage: PipelineStage) => {
    if (newStage === "consulta_agendada" && lead.stage !== "consulta_agendada") {
      setScheduleDialog({ lead });
      return;
    }
    moveLead(lead.id, newStage);
    toast.success(`${lead.name} movido para ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    let result = leads.filter(l => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search);
      const matchSource = sourceFilter === "all" || l.source === sourceFilter;
      const matchStage = stageFilter === "all" || l.stage === stageFilter;
      const matchCampaign = campaignFilter === "all" || l.utm_campaign === campaignFilter;
      return matchSearch && matchSource && matchStage && matchCampaign;
    });
    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortField === "name") cmp = a.name.localeCompare(b.name, "pt-BR");
        else if (sortField === "procedure") cmp = a.procedure.localeCompare(b.procedure, "pt-BR");
        else if (sortField === "source") cmp = a.source.localeCompare(b.source, "pt-BR");
        else if (sortField === "stage") {
          const stageOrder = PIPELINE_STAGES.map(s => s.id);
          cmp = stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
        }
        else if (sortField === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return result;
  }, [leads, search, sourceFilter, stageFilter, campaignFilter, sortField, sortDir]);

  return (
    <CRMLayout title="Leads">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {campaignOptions.length > 0 && (
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campanha" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as campanhas</SelectItem>
                {campaignOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <span className="flex items-center">Nome <SortIcon field="name" /></span>
                </TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("source")}>
                  <span className="flex items-center">Origem <SortIcon field="source" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("stage")}>
                  <span className="flex items-center">Etapa <SortIcon field="stage" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("procedure")}>
                  <span className="flex items-center">Procedimento <SortIcon field="procedure" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                  <span className="flex items-center">Data <SortIcon field="created_at" /></span>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, visible).map(lead => {
                const stage = PIPELINE_STAGES.find(s => s.id === lead.stage);
                return (
                   <TableRow key={lead.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {lead.name}
                        {isNewLead(lead.created_at) && <NewLeadBadge showText />}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatPhone(lead.phone)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[lead.source] || ""}`}>
                        {lead.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={lead.stage} 
                        onValueChange={(val) => handleStageChange(lead, val as PipelineStage)}
                      >
                        <SelectTrigger 
                          className={`h-7 text-[11px] font-medium w-[170px] ${stage?.color || ""}`} 
                          onClick={e => e.stopPropagation()}
                          onPointerDown={e => e.stopPropagation()}
                        >
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
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{lead.procedure}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(lead.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <StartWhatsAppButton lead={lead} label="Converse" size="sm" className="h-8 px-3 text-xs" openInDialog />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {filtered.length > visible && (
            <div className="p-3 text-center">
              <button className="text-sm font-medium text-accent hover:underline" onClick={() => setVisible(v => v + 100)}>
                Mostrar mais ({filtered.length - visible} restantes)
              </button>
            </div>
          )}
        </div>
      </div>
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
            moveLead(scheduleDialog.lead.id, "consulta_agendada" as PipelineStage);
            toast.success(`${scheduleDialog.lead.name} movido para Consulta Agendada com agendamento!`);
            setScheduleDialog(null);
          }}
        />
      )}
    </CRMLayout>
  );
}

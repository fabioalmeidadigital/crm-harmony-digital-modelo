import { useMemo, useState, useEffect } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { useLeads } from "@/contexts/LeadsContext";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/lib/types";
import {
  ATTENDANCE_STATUSES, STATUS_TO_STAGE, MONTHS, SHEET_SOURCES, INSURANCES, MODALITIES, TEMPERATURES, CONTACT_REASONS, leadContactDate, statusClass,
} from "@/lib/attendance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadDetailDialog } from "@/components/LeadDetailDialog";
import { Download, Plus, Search, ExternalLink, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useSheetOptions } from "@/hooks/useSheetOptions";

const ALL = "__all";
const PAGE = 100;

type ColKey = keyof Lead;
type Col = { key: ColKey; label: string; w: string; type: "text" | "date" | "select" | "number" | "bool"; options?: readonly string[]; opt?: string };

const COLS: Col[] = [
  { key: "first_contact_date", label: "Data 1º contato", w: "w-36", type: "date" },
  { key: "name", label: "Nome", w: "w-48", type: "text" },
  { key: "phone", label: "Telefone", w: "w-32", type: "text" },
  { key: "attendance_status", label: "Status", w: "w-36", type: "select", options: ATTENDANCE_STATUSES.map(s => s.id) },
  { key: "scheduled_info", label: "Data agendada", w: "w-32", type: "text" },
  { key: "antecipar", label: "Antecipar", w: "w-20", type: "bool" },
  { opt: "source", key: "source", label: "Origem", w: "w-36", type: "select", options: SHEET_SOURCES },
  { key: "referral", label: "Indicação", w: "w-32", type: "text" },
  { opt: "modality", key: "modality", label: "Online/Presencial", w: "w-32", type: "select", options: MODALITIES },
  { key: "reservation_fee", label: "Tx reserva", w: "w-24", type: "number" },
  { key: "payment_method", label: "Forma pgto", w: "w-28", type: "text" },
  { key: "consult_value", label: "Valor consulta", w: "w-24", type: "number" },
  { opt: "insurance", key: "insurance", label: "Particular/Convênio", w: "w-32", type: "select", options: INSURANCES },
  { opt: "procedure", key: "procedure", label: "Motivo do contato", w: "w-40", type: "select", options: CONTACT_REASONS },
  { key: "observation", label: "Observação", w: "w-64", type: "text" },
  { opt: "temperature", key: "temperature", label: "Temperatura", w: "w-28", type: "select", options: TEMPERATURES },
  { key: "contact_1", label: "1º contato", w: "w-36", type: "date" },
  { key: "contact_2", label: "2º contato", w: "w-36", type: "date" },
  { key: "contact_3", label: "3º contato", w: "w-36", type: "date" },
  { key: "contact_4", label: "4º contato", w: "w-36", type: "date" },
  { opt: "attendant", key: "attendant", label: "Responsável", w: "w-32", type: "select" },
];

function Cell({ lead, col, onSave }: { lead: Lead; col: Col; onSave: (v: any) => void }) {
  const raw = lead[col.key] as any;
  const [val, setVal] = useState<string>(raw == null ? "" : String(raw));
  useEffect(() => { setVal(raw == null ? "" : String(raw)); }, [raw]);
  const base = "h-8 rounded-none border-0 bg-transparent px-2 text-xs focus-visible:ring-1 focus-visible:ring-ring";

  if (col.type === "bool") {
    return (
      <div className="flex justify-center">
        <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" checked={!!raw} onChange={e => onSave(e.target.checked)} />
      </div>
    );
  }
  if (col.type === "select") {
    const opts = col.options || [];
    const list = raw && !opts.includes(raw) ? [raw, ...opts] : opts;
    return (
      <Select value={raw || "__none"} onValueChange={v => onSave(v === "__none" ? null : v)}>
        <SelectTrigger className={`${base} ${col.key === "attendance_status" ? statusClass(raw) : ""}`}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">—</SelectItem>
          {list.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      className={base}
      type={col.type === "date" ? "date" : col.type === "number" ? "number" : "text"}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        const cur = raw == null ? "" : String(raw);
        if (val === cur) return;
        if (col.type === "number") onSave(val === "" ? null : parseFloat(val.replace(",", ".")));
        else if (col.key === "name" || col.key === "phone") { if (val.trim()) onSave(val.trim()); else setVal(cur); }
        else onSave(val === "" ? null : val);
      }}
      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
    />
  );
}

export default function Atendimento() {
  const { leads, updateLead, refreshLeads, loading, error } = useLeads();
  const [search, setSearch] = useState("");
  const [f, setF] = useState<Record<string, string>>({ year: String(new Date().getFullYear()) });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const opts = useSheetOptions();
  const cols = useMemo(() => COLS.map(c => c.opt ? { ...c, options: opts[c.opt] } : c), [opts]);

  const setFilter = (k: string, v: string) => { setF(p => ({ ...p, [k]: v })); setPage(0); };

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    const qd = q.replace(/\D/g, "");
    const out = leads.filter(l => {
      if (l.stage === "fornecedor") return false;
      const d = leadContactDate(l);
      if (f.year && f.year !== ALL && String(d.getFullYear()) !== f.year) return false;
      if (f.month && f.month !== ALL && String(d.getMonth()) !== f.month) return false;
      if (from && d < new Date(from + "T00:00:00")) return false;
      if (to && d > new Date(to + "T23:59:59")) return false;
      for (const k of ["attendance_status", "source", "insurance", "procedure", "temperature", "modality", "attendant"]) {
        const v = f[k];
        if (v && v !== ALL && ((l as any)[k] || "__empty") !== v) return false;
      }
      if (f.antecipar === "sim" && !l.antecipar) return false;
      if (q && !(l.name.toLowerCase().includes(q) || (qd && l.phone.replace(/\D/g, "").includes(qd)))) return false;
      return true;
    });
    out.sort((a, b) => (leadContactDate(a).getTime() - leadContactDate(b).getTime()) * (sortAsc ? 1 : -1));
    return out;
  }, [leads, search, f, from, to, sortAsc]);

  const years = useMemo(() => Array.from(new Set([new Date().getFullYear(), ...leads.map(l => leadContactDate(l).getFullYear())])).sort((a, b) => b - a), [leads]);
  const pageRows = rows.slice(page * PAGE, (page + 1) * PAGE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));

  const save = (lead: Lead, key: ColKey, v: any) => {
    const upd: Partial<Lead> = { [key]: v } as any;
    if (key === "attendance_status" && v && STATUS_TO_STAGE[v]) {
      upd.stage = STATUS_TO_STAGE[v];
      if (v === "Sem resposta") { upd.disqualification_reason = "sem_resposta"; upd.disqualified_at = new Date().toISOString(); }
    }
    updateLead(lead.id, upd);
  };

  const addRow = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("leads").insert({
      name: "Novo contato", phone: "0000000000" + Math.floor(Math.random() * 1000), source: "Não informado",
      procedure: "Não informado", stage: "novo_lead", first_contact_date: today, attendance_status: "Negociação",
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Linha criada — preencha nome e telefone");
    setSearch("Novo contato");
    refreshLeads();
  };

  const exportCsv = () => {
    const data = rows.map(l => Object.fromEntries(cols.map(c => [c.label, c.type === "bool" ? ((l as any)[c.key] ? "SIM" : "") : (l as any)[c.key] ?? ""])));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = cols.map(c => ({ wch: c.key === "observation" ? 50 : 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atendimento");
    XLSX.writeFile(wb, `atendimento-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };


  const FilterSel = ({ k, label, options }: { k: string; label: string; options: readonly string[] }) => (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <Select value={f[k] || ALL} onValueChange={v => setFilter(k, v)}>
        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          <SelectItem value="__empty">(vazio)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach(l => { const s = l.attendance_status || "Sem status"; c[s] = (c[s] || 0) + 1; });
    return c;
  }, [rows]);

  return (
    <CRMLayout title="Atendimento">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Busca</span>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input className="h-8 w-52 pl-8 text-xs" placeholder="Nome ou telefone" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ano</span>
            <Select value={f.year || ALL} onValueChange={v => setFilter("year", v)}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ALL}>Todos</SelectItem>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Mês</span>
            <Select value={f.month || ALL} onValueChange={v => setFilter("month", v)}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ALL}>Todos</SelectItem>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">De / Até</span>
            <div className="flex gap-1">
              <Input type="date" className="h-8 w-34 text-xs" value={from} onChange={e => { setFrom(e.target.value); setPage(0); }} />
              <Input type="date" className="h-8 w-34 text-xs" value={to} onChange={e => { setTo(e.target.value); setPage(0); }} />
            </div>
          </div>
          <FilterSel k="attendance_status" label="Status" options={ATTENDANCE_STATUSES.map(s => s.id)} />
          <FilterSel k="source" label="Origem" options={opts.source} />
          <FilterSel k="insurance" label="Convênio" options={opts.insurance} />
          <FilterSel k="procedure" label="Motivo" options={opts.procedure} />
          <FilterSel k="temperature" label="Temperatura" options={opts.temperature} />
          <FilterSel k="attendant" label="Responsável" options={opts.attendant} />
          <FilterSel k="modality" label="Online/Presencial" options={opts.modality} />
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Antecipar</span>
            <Select value={f.antecipar || ALL} onValueChange={v => setFilter("antecipar", v)}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ALL}>Todos</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setF({}); setFrom(""); setTo(""); setSearch(""); }}>Limpar</Button>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={exportCsv}><Download className="h-4 w-4" /> Exportar</Button>
            <Button size="sm" className="h-8 gap-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={addRow}><Plus className="h-4 w-4" /> Nova linha</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span key={loading ? "l" : rows.length} className="font-semibold text-foreground">{loading ? "Carregando..." : `${rows.length} contatos`}</span>
          {Object.entries(counts).map(([s, n]) => (
            <span key={s} className={`rounded px-2 py-0.5 ${statusClass(s) || "bg-secondary text-secondary-foreground"}`}>{s}: {n}</span>
          ))}
        </div>

        <div className="overflow-auto rounded-md border bg-card" style={{ maxHeight: "calc(100vh - 290px)" }}>
          <table className="border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-primary text-primary-foreground">
              <tr>
                <th className="w-8 border-r border-primary-foreground/20 px-1">#</th>
                {cols.map(c => (
                  <th key={c.key} className={`${c.w} min-w-[inherit] border-r border-primary-foreground/20 px-2 py-2 text-left font-semibold whitespace-nowrap`}>
                    {c.key === "first_contact_date"
                      ? <button className="flex items-center gap-1" onClick={() => setSortAsc(s => !s)}>{c.label}<ArrowUpDown className="h-3 w-3" /></button>
                      : c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((l, i) => (
                <tr key={l.id} className="border-b hover:bg-secondary/40">
                  <td className="border-r px-1 text-center text-muted-foreground">
                    <button title="Abrir cadastro" onClick={() => setOpenLead(l)} className="flex items-center gap-0.5 hover:text-foreground">
                      {page * PAGE + i + 1}<ExternalLink className="h-3 w-3" />
                    </button>
                  </td>
                  {cols.map(c => (
                    <td key={c.key} className={`${c.w} border-r p-0`}>
                      <div className={c.w}><Cell lead={l} col={c} onSave={v => save(l, c.key, v)} /></div>
                    </td>
                  ))}
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={cols.length + 1} className="py-10 text-center text-muted-foreground">
                  {loading ? "Carregando contatos..." : error
                    ? <span>{error} <Button size="sm" variant="outline" className="ml-2 h-7" onClick={() => refreshLeads()}>Tentar novamente</Button></span>
                    : "Nenhum contato encontrado com esses filtros."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 text-xs">
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span>Página {page + 1} de {pages}</span>
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <LeadDetailDialog lead={openLead} open={!!openLead} onOpenChange={o => { if (!o) setOpenLead(null); }} />
    </CRMLayout>
  );
}

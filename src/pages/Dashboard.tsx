import { CRMLayout } from "@/components/CRMLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeads } from "@/contexts/LeadsContext";
import { PIPELINE_STAGES, PIPE1_STAGES, PIPE2_STAGES, SOURCE_COLORS } from "@/lib/constants";
import { timeAgo, formatPhone, openWhatsApp, isNewLead } from "@/lib/whatsapp";
import { NewLeadBadge } from "@/components/NewLeadBadge";
import { Users, Calendar, CalendarCheck, TrendingUp, MessageCircle, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#FF6D6A", "#00205B", "#334D7C", "#7F8FAC", "#E6E9EF", "#FFB5B4", "#FF8A88"];

const FUNNEL_COLORS_LEADS = ["#00205B", "#334D7C", "#5A7AB5", "#7F8FAC"];
const FUNNEL_COLORS_VENDAS = ["#FF6D6A", "#E85550", "#D04440", "#B83535", "#8B2828", "#6B1F1F"];

function FunnelChart({ title, stages, colors, leads }: {
  title: string;
  stages: readonly { id: string; label: string; color: string }[];
  colors: string[];
  leads: any[];
}) {
  const maxCount = Math.max(...stages.map(s => leads.filter(l => l.stage === s.id).length), 1);

  return (
    <div className="flex-1">
      <h3 className="text-sm font-semibold text-foreground mb-4 text-center">{title}</h3>
      <div className="flex flex-col items-center gap-1">
        {stages.map((stage, i) => {
          const count = leads.filter(l => l.stage === stage.id).length;
          const widthPercent = Math.max(((stages.length - i) / stages.length) * 100, 30);

          return (
            <div key={stage.id} className="w-full flex flex-col items-center">
              <div
                className="relative flex items-center justify-center py-3 rounded-md transition-all hover:opacity-90 cursor-default"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: colors[i % colors.length],
                  minHeight: "44px",
                }}
              >
                <div className="flex items-center gap-2 px-3">
                  <span className="text-white font-bold text-lg">{count}</span>
                  <span className="text-white/90 text-xs font-medium truncate">{stage.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { leads } = useLeads();
  const [rangePreset, setRangePreset] = useState<string>("all");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const startOf = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    if (rangePreset === "today") return { startDate: startOf(now), endDate: end };
    if (rangePreset === "yesterday") {
      const y = new Date(now.getTime() - 86400000);
      return { startDate: startOf(y), endDate: (() => { const e = new Date(y); e.setHours(23, 59, 59, 999); return e; })() };
    }
    if (rangePreset === "7d") return { startDate: startOf(new Date(now.getTime() - 6 * 86400000)), endDate: end };
    if (rangePreset === "15d") return { startDate: startOf(new Date(now.getTime() - 14 * 86400000)), endDate: end };
    if (rangePreset === "30d") return { startDate: startOf(new Date(now.getTime() - 29 * 86400000)), endDate: end };
    if (rangePreset === "custom") {
      return {
        startDate: customStart ? startOf(customStart) : undefined,
        endDate: customEnd ? (() => { const x = new Date(customEnd); x.setHours(23, 59, 59, 999); return x; })() : undefined,
      };
    }
    return { startDate: undefined as Date | undefined, endDate: undefined as Date | undefined };
  }, [rangePreset, customStart, customEnd]);

  const filteredLeads = useMemo(() => {
    // Fornecedores não contam como leads do funil comercial
    const base = leads.filter(l => l.stage !== "fornecedor");
    if (!startDate && !endDate) return base;
    return base.filter(l => {
      const d = new Date(l.created_at);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [leads, startDate, endDate]);

  const totalLeads = filteredLeads.length;
  const consultasAgendadas = filteredLeads.filter(l => l.stage === "consulta_agendada").length;
  const consultasRealizadas = filteredLeads.filter(l => l.stage === "consulta_realizada").length;
  const realizados = filteredLeads.filter(l => l.stage === "cirurgia_realizada" || l.stage === "pos_procedimento").length;
  const conversionRate = totalLeads > 0 ? Math.round((realizados / totalLeads) * 100) : 0;

  const sourceData = Object.entries(
    filteredLeads.reduce((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const recentLeads = [...filteredLeads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const kpis = [
    { label: "Total de Leads", value: totalLeads, icon: Users, color: "text-primary" },
    { label: "Consultas Agendadas", value: consultasAgendadas, icon: Calendar, color: "text-amber-600" },
    { label: "Consultas Realizadas", value: consultasRealizadas, icon: CalendarCheck, color: "text-coral" },
    { label: "Taxa de Conversão", value: `${conversionRate}%`, icon: TrendingUp, color: "text-green-600" },
  ];

  return (
    <CRMLayout title="Dashboard">
      <div className="space-y-6">
        {/* Date Filter */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Período:</span>
            </div>
            <Select value={rangePreset} onValueChange={setRangePreset}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="15d">Últimos 15 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
            </Select>
            {rangePreset === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal w-[180px]", !customStart && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStart ? format(customStart, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComp mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-sm">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal w-[180px]", !customEnd && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEnd ? format(customEnd, "dd/MM/yyyy", { locale: ptBR }) : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComp mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            {startDate && endDate && (
              <span className="text-xs text-muted-foreground ml-auto">
                {format(startDate, "dd/MM/yyyy")} → {format(endDate, "dd/MM/yyyy")} · {totalLeads} leads
              </span>
            )}
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <Card key={kpi.label} className="border-none shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-secondary ${kpi.color}`}>
                  <kpi.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  {index === 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      {sourceData.map(({ name, value }) => (
                        <Badge
                          key={name}
                          variant="outline"
                          className={`text-[10px] ${SOURCE_COLORS[name] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                        >
                          {name}: {value}
                        </Badge>
                      ))}
                      {sourceData.length === 0 && (
                        <span className="text-[10px] text-muted-foreground">Nenhum lead no período</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Funnel Charts */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Resumo do Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-8">
              <FunnelChart title="🎯 Funil de Leads" stages={PIPE1_STAGES} colors={FUNNEL_COLORS_LEADS} leads={leads} />
              <FunnelChart title="💼 Funil de Fechamento" stages={PIPE2_STAGES} colors={FUNNEL_COLORS_VENDAS} leads={leads} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Leads por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sourceData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Leads Recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLeads.map(lead => {
                const stage = PIPELINE_STAGES.find(s => s.id === lead.stage);
                return (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
                    {isNewLead(lead.created_at) && <NewLeadBadge />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[lead.source] || ""}`}>
                      {lead.source}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{timeAgo(lead.created_at)}</span>
                  </div>
                </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
                      onClick={() => openWhatsApp(lead.phone, `Olá ${lead.name}, tudo bem? Aqui é da clínica!`)}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </CRMLayout>
  );
}

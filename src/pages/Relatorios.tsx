import { CRMLayout } from "@/components/CRMLayout";
import { ResponseTimeReport } from "@/components/relatorios/ResponseTimeReport";
import { SheetDashboard } from "@/components/relatorios/SheetDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeads } from "@/contexts/LeadsContext";
import { PIPELINE_STAGES } from "@/lib/constants";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts";

const COLORS = ["#FF6D6A", "#00205B", "#334D7C", "#7F8FAC", "#FF8A88", "#FFB5B4", "#E6E9EF"];
const WON_STAGES = ["consulta_realizada", "cirurgia_marcada", "ganho"];
const LOST_STAGES = ["perdido"];

export default function Relatorios() {
  const { leads } = useLeads();

  const sourceData = Object.entries(
    leads.reduce((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const stageData = PIPELINE_STAGES.map(s => ({
    name: s.label,
    value: leads.filter(l => l.stage === s.id).length,
  }));

  const procedureData = Object.entries(
    leads.reduce((acc, l) => { acc[l.procedure] = (acc[l.procedure] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Análise por campanha (UTM)
  const campaignAnalysis = useMemo(() => {
    const map = new Map<string, { campaign: string; source: string; total: number; won: number; lost: number; in_progress: number }>();
    leads.forEach(l => {
      if (!l.utm_campaign && !l.utm_source) return;
      const key = `${l.utm_source || "—"}__${l.utm_campaign || "—"}`;
      if (!map.has(key)) {
        map.set(key, {
          campaign: l.utm_campaign || "—",
          source: l.utm_source || "—",
          total: 0, won: 0, lost: 0, in_progress: 0,
        });
      }
      const e = map.get(key)!;
      e.total++;
      if (WON_STAGES.includes(l.stage)) e.won++;
      else if (LOST_STAGES.includes(l.stage)) e.lost++;
      else e.in_progress++;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [leads]);

  const sourceAnalysis = useMemo(() => {
    const map = new Map<string, { source: string; total: number; won: number; conversion: number }>();
    leads.forEach(l => {
      const key = l.utm_source || l.source || "Não informado";
      if (!map.has(key)) map.set(key, { source: key, total: 0, won: 0, conversion: 0 });
      const e = map.get(key)!;
      e.total++;
      if (WON_STAGES.includes(l.stage)) e.won++;
    });
    return Array.from(map.values())
      .map(e => ({ ...e, conversion: e.total > 0 ? (e.won / e.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  const totalUtm = leads.filter(l => l.utm_source || l.utm_campaign).length;
  const totalUtmWon = leads.filter(l => (l.utm_source || l.utm_campaign) && WON_STAGES.includes(l.stage)).length;
  const utmConversion = totalUtm > 0 ? ((totalUtmWon / totalUtm) * 100).toFixed(1) : "0";

  return (
    <CRMLayout title="Relatórios">
      <Tabs defaultValue="atendimento" className="space-y-4">
        <TabsList>
          <TabsTrigger value="atendimento">Atendimentos (planilha)</TabsTrigger>
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas (UTM)</TabsTrigger>
          <TabsTrigger value="resposta">Tempo de Resposta</TabsTrigger>
        </TabsList>

        <TabsContent value="atendimento">
          <SheetDashboard />
        </TabsContent>

        <TabsContent value="resposta">
          <ResponseTimeReport />
        </TabsContent>

        <TabsContent value="geral">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-base">Leads por Origem</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-base">Funil de Conversão</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stageData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#00205B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Leads por Procedimento</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={procedureData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#FF6D6A" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campanhas">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">Leads com UTM rastreada</p>
                  <p className="text-3xl font-bold text-primary mt-1">{totalUtm}</p>
                  <p className="text-xs text-muted-foreground mt-1">de {leads.length} leads totais</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">Convertidos (campanhas)</p>
                  <p className="text-3xl font-bold text-accent mt-1">{totalUtmWon}</p>
                  <p className="text-xs text-muted-foreground mt-1">leads ganhos via campanha</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">Taxa de conversão UTM</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{utmConversion}%</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-base">Performance por origem (utm_source)</CardTitle></CardHeader>
              <CardContent>
                {sourceAnalysis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda. Configure UTMs em Admin → Marketing / UTM.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Ganhos</TableHead>
                        <TableHead className="text-right">Conversão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sourceAnalysis.map(s => (
                        <TableRow key={s.source}>
                          <TableCell className="font-medium">{s.source}</TableCell>
                          <TableCell className="text-right">{s.total}</TableCell>
                          <TableCell className="text-right">{s.won}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={s.conversion > 20 ? "default" : "secondary"}>
                              {s.conversion.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-base">Detalhamento por campanha</CardTitle></CardHeader>
              <CardContent>
                {campaignAnalysis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma campanha rastreada ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Em andamento</TableHead>
                        <TableHead className="text-right">Ganhos</TableHead>
                        <TableHead className="text-right">Perdidos</TableHead>
                        <TableHead className="text-right">Conversão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignAnalysis.map((c, i) => {
                        const conv = c.total > 0 ? (c.won / c.total) * 100 : 0;
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-medium font-mono text-xs">{c.campaign}</TableCell>
                            <TableCell className="text-xs">{c.source}</TableCell>
                            <TableCell className="text-right">{c.total}</TableCell>
                            <TableCell className="text-right">{c.in_progress}</TableCell>
                            <TableCell className="text-right text-green-600">{c.won}</TableCell>
                            <TableCell className="text-right text-red-600">{c.lost}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={conv > 20 ? "default" : "secondary"}>
                                {conv.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </CRMLayout>
  );
}

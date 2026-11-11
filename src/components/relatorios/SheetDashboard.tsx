import { useMemo, useState } from "react";
import { useLeads } from "@/contexts/LeadsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MONTHS, leadContactDate, ATTENDANCE_STATUSES } from "@/lib/attendance";
import { DISQUALIFICATION_REASONS } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";

const PALETTE = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(152 60% 40%)", "hsl(40 90% 50%)", "hsl(200 80% 50%)", "hsl(280 50% 55%)", "hsl(0 75% 55%)", "hsl(220 10% 60%)"];

export function SheetDashboard() {
  const { leads } = useLeads();
  const years = useMemo(() => Array.from(new Set(leads.map(l => leadContactDate(l).getFullYear()))).sort((a, b) => b - a), [leads]);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const data = useMemo(() => leads.filter(l => l.stage !== "fornecedor" && String(leadContactDate(l).getFullYear()) === year), [leads, year]);

  const monthly = useMemo(() => MONTHS.map((m, i) => {
    const ls = data.filter(l => leadContactDate(l).getMonth() === i);
    const ag = ls.filter(l => l.attendance_status === "Agendada").length;
    const neg = ls.filter(l => l.attendance_status === "Negociação").length;
    const perda = ls.filter(l => l.attendance_status === "Perda" || l.attendance_status === "Cancelou").length;
    const sr = ls.filter(l => l.attendance_status === "Sem resposta").length;
    return { mes: m, Atendimentos: ls.length, Agendados: ag, Negociação: neg, Perdas: perda, "Sem resposta": sr, conv: ls.length ? (ag / ls.length) * 100 : 0 };
  }), [data]);

  const topSources = useMemo(() => {
    const c: Record<string, number> = {};
    data.forEach(l => { c[l.source || "Não informado"] = (c[l.source || "Não informado"] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  }, [data]);

  const sourceMonthly = useMemo(() => MONTHS.map((m, i) => {
    const row: Record<string, any> = { mes: m };
    topSources.forEach(s => { row[s] = data.filter(l => leadContactDate(l).getMonth() === i && (l.source || "Não informado") === s).length; });
    return row;
  }), [data, topSources]);

  const byProc = useMemo(() => {
    const c: Record<string, number> = {};
    data.forEach(l => { const p = l.procedure || "Não informado"; c[p] = (c[p] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [data]);

  const byStatus = useMemo(() => ATTENDANCE_STATUSES.map(s => ({ name: s.id, value: data.filter(l => l.attendance_status === s.id).length, fill: s.chart })).filter(x => x.value), [data]);

  const lossReasons = useMemo(() => {
    const c: Record<string, number> = {};
    data.filter(l => l.disqualification_reason || l.attendance_status === "Perda" || l.attendance_status === "Cancelou").forEach(l => {
      const r = DISQUALIFICATION_REASONS.find(x => x.id === l.disqualification_reason)?.label || (l.attendance_status === "Cancelou" ? "Cancelou" : "Motivo não informado");
      c[r] = (c[r] || 0) + 1;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [data]);

  const ranking = useMemo(() => {
    const c: Record<string, { at: number; ag: number }> = {};
    data.forEach(l => { const a = l.attendant || "Sem responsável"; c[a] ||= { at: 0, ag: 0 }; c[a].at++; if (l.attendance_status === "Agendada") c[a].ag++; });
    return Object.entries(c).sort((a, b) => b[1].ag - a[1].ag || b[1].at - a[1].at);
  }, [data]);

  const tot = monthly.reduce((a, m) => ({ at: a.at + m.Atendimentos, ag: a.ag + m.Agendados, neg: a.neg + m.Negociação, pe: a.pe + m.Perdas }), { at: 0, ag: 0, neg: 0, pe: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Ano</span>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[["Atendimentos", tot.at], ["Agendados", tot.ag], ["Negociação", tot.neg], ["Perdas", tot.pe], ["Taxa de conversão", tot.at ? ((tot.ag / tot.at) * 100).toFixed(1) + "%" : "—"]].map(([k, v]) => (
          <Card key={k as string} className="border-none shadow-sm"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{k}</p><p className="text-2xl font-bold text-foreground">{v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-base">Atendimentos mensais</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
              <Bar dataKey="Atendimentos" fill="hsl(var(--primary))" />
              <Bar dataKey="Agendados" fill="hsl(152 60% 40%)" />
              <Bar dataKey="Negociação" fill="hsl(40 90% 50%)" />
              <Bar dataKey="Perdas" fill="hsl(0 75% 55%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-base">Resumo por mês</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Mês</TableHead><TableHead className="text-right">Atendimentos</TableHead><TableHead className="text-right">Agendado</TableHead>
              <TableHead className="text-right">Negociação</TableHead><TableHead className="text-right">Sem resposta</TableHead><TableHead className="text-right">Perda</TableHead><TableHead className="text-right">Conversão</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {monthly.map(m => (
                <TableRow key={m.mes}>
                  <TableCell className="font-medium">{m.mes}</TableCell>
                  <TableCell className="text-right">{m.Atendimentos}</TableCell><TableCell className="text-right">{m.Agendados}</TableCell>
                  <TableCell className="text-right">{m.Negociação}</TableCell><TableCell className="text-right">{m["Sem resposta"]}</TableCell>
                  <TableCell className="text-right">{m.Perdas}</TableCell><TableCell className="text-right">{m.Atendimentos ? m.conv.toFixed(1) + "%" : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Origem por mês</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceMonthly}>
                <XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                {topSources.map((s, i) => <Bar key={s} dataKey={s} stackId="a" fill={PALETTE[i % PALETTE.length]} />)}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">% Atendimentos por procedimento</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byProc} dataKey="value" nameKey="name" outerRadius={90} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {byProc.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Status dos atendimentos</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                  {byStatus.map((s, i) => <Cell key={i} fill={s.fill} />)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Motivos de perda</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lossReasons} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" width={160} fontSize={11} /><Tooltip />
                <Bar dataKey="value" name="Leads" fill="hsl(0 75% 55%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Ranking por responsável</CardTitle></CardHeader>
          <CardContent className="overflow-auto max-h-72">
            <Table>
              <TableHeader><TableRow><TableHead>Responsável</TableHead><TableHead className="text-right">Atendimentos</TableHead><TableHead className="text-right">Agendados</TableHead><TableHead className="text-right">Conversão</TableHead></TableRow></TableHeader>
              <TableBody>
                {ranking.map(([a, v]) => (
                  <TableRow key={a}><TableCell className="font-medium">{a}</TableCell><TableCell className="text-right">{v.at}</TableCell><TableCell className="text-right">{v.ag}</TableCell><TableCell className="text-right">{((v.ag / v.at) * 100).toFixed(1)}%</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

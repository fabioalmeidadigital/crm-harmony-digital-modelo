import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useResponseTimes, median } from "@/hooks/useResponseTimes";
import { formatMinutes, BUSINESS_HOURS } from "@/lib/businessHours";
import { formatDateTime } from "@/lib/whatsapp";

const BUCKETS = [
  { label: "Até 5 min", max: 5 },
  { label: "5 a 15 min", max: 15 },
  { label: "15 a 60 min", max: 60 },
  { label: "1h a 4h", max: 240 },
  { label: "Mais de 4h", max: Infinity },
];

export function ResponseTimeReport() {
  const [days, setDays] = useState(30);
  const { data: pairs = [], isLoading } = useResponseTimes(days);

  const stats = useMemo(() => {
    const answered = pairs.filter(p => p.businessMinutes != null);
    const mins = answered.map(p => p.businessMinutes as number);
    const outside = pairs.filter(p => !p.duringBusinessHours);
    const outsideAnswered = outside.filter(p => p.businessMinutes != null).map(p => p.businessMinutes as number);
    const insideAnswered = pairs
      .filter(p => p.duringBusinessHours && p.businessMinutes != null)
      .map(p => p.businessMinutes as number);

    const buckets = BUCKETS.map(b => ({ name: b.label, value: 0 }));
    mins.forEach(m => {
      const idx = BUCKETS.findIndex(b => m <= b.max);
      buckets[idx === -1 ? BUCKETS.length - 1 : idx].value++;
    });

    const byHour = Array.from({ length: 24 }, (_, h) => ({ name: `${String(h).padStart(2, "0")}h`, hour: h, value: 0 }));
    pairs.forEach(p => byHour[p.hour].value++);

    return {
      total: pairs.length,
      answered: answered.length,
      unanswered: pairs.length - answered.length,
      avg: mins.length ? mins.reduce((a, b) => a + b, 0) / mins.length : null,
      med: median(mins),
      outsideCount: outside.length,
      outsidePct: pairs.length ? (outside.length / pairs.length) * 100 : 0,
      outsideAvg: outsideAnswered.length ? outsideAnswered.reduce((a, b) => a + b, 0) / outsideAnswered.length : null,
      insideAvg: insideAnswered.length ? insideAnswered.reduce((a, b) => a + b, 0) / insideAnswered.length : null,
      over60: mins.filter(m => m > 60).length,
      buckets,
      byHour,
    };
  }, [pairs]);

  const slowest = useMemo(
    () => [...pairs]
      .filter(p => p.businessMinutes != null)
      .sort((a, b) => (b.businessMinutes as number) - (a.businessMinutes as number))
      .slice(0, 15),
    [pairs]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          Horário comercial considerado: seg a sex, {BUSINESS_HOURS.startHour}h às {BUSINESS_HOURS.endHour}h (Brasília).
          O tempo de resposta conta apenas minutos dentro desse horário.
        </p>
        <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Calculando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Tempo médio de resposta</p>
                <p className="text-3xl font-bold text-primary mt-1">{formatMinutes(stats.avg)}</p>
                <p className="text-xs text-muted-foreground mt-1">mediana: {formatMinutes(stats.med)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Contatos recebidos</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.answered} respondidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Fora do horário comercial</p>
                <p className="text-3xl font-bold text-accent mt-1">{stats.outsideCount}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.outsidePct.toFixed(0)}% dos contatos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Sem resposta</p>
                <p className="text-3xl font-bold text-destructive mt-1">{stats.unanswered}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.over60} respostas acima de 1h</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Chegaram dentro do horário — média</p>
                <p className="text-2xl font-bold text-primary mt-1">{formatMinutes(stats.insideAvg)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Chegaram fora do horário — média até responder</p>
                <p className="text-2xl font-bold text-accent mt-1">{formatMinutes(stats.outsideAvg)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-base">Distribuição do tempo de resposta</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.buckets}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00205B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Contatos por hora do dia (barras claras = fora do horário)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.byHour}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {stats.byHour.map(h => (
                      <Cell
                        key={h.hour}
                        fill={h.hour >= BUSINESS_HOURS.startHour && h.hour < BUSINESS_HOURS.endHour ? "#00205B" : "#FFB5B4"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-base">Maiores demoras</CardTitle></CardHeader>
            <CardContent>
              {slowest.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sem dados no período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contato</TableHead>
                      <TableHead>Mensagem recebida</TableHead>
                      <TableHead>Respondida em</TableHead>
                      <TableHead className="text-right">Tempo (hor. comercial)</TableHead>
                      <TableHead className="text-right">Chegou</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowest.map((p, i) => (
                      <TableRow key={`${p.conversation_id}-${i}`}>
                        <TableCell className="font-medium">{p.contact_name || "—"}</TableCell>
                        <TableCell className="text-xs">{formatDateTime(p.inbound_at)}</TableCell>
                        <TableCell className="text-xs">{p.replied_at ? formatDateTime(p.replied_at) : "—"}</TableCell>
                        <TableCell className="text-right">{formatMinutes(p.businessMinutes)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={p.duringBusinessHours ? "secondary" : "outline"} className="text-[10px]">
                            {p.duringBusinessHours ? "No horário" : "Fora do horário"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

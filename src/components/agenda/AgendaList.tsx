import { useAppointments, useUpdateAppointment, useDeleteAppointment } from "@/hooks/useAppointments";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Trash2, CalendarSync, Check } from "lucide-react";
import { useSyncToGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { openWhatsApp } from "@/lib/whatsapp";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente", confirmado: "Confirmado", cancelado: "Cancelado", realizado: "Realizado",
};
const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700 border-amber-200",
  confirmado: "bg-green-100 text-green-700 border-green-200",
  cancelado: "bg-red-100 text-red-700 border-red-200",
  realizado: "bg-blue-100 text-blue-700 border-blue-200",
};

interface Props {
  onSelectLead?: (leadId: string) => void;
}

export function AgendaList({ onSelectLead }: Props) {
  const { data: appointments = [], isLoading } = useAppointments();
  const updateMutation = useUpdateAppointment();
  const deleteMutation = useDeleteAppointment();
  const syncToGoogle = useSyncToGoogleCalendar();

  const handleStatusChange = (id: string, status: string) => {
    updateMutation.mutate({ id, status } as any, {
      onSuccess: () => toast.success("Status atualizado!"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Excluir este agendamento?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Agendamento excluído!"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Procedimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lembretes</TableHead>
              <TableHead>Google</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map(apt => (
              <TableRow key={apt.id} className="cursor-pointer" onClick={() => onSelectLead?.(apt.lead_id)}>
                <TableCell className="font-medium">{formatDate(apt.scheduled_at)}</TableCell>
                <TableCell>{formatTime(apt.scheduled_at)}</TableCell>
                <TableCell className="text-accent font-medium hover:underline">{apt.leads?.name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{apt.procedure_name}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Select value={apt.status} onValueChange={v => handleStatusChange(apt.id, v)}>
                    <SelectTrigger className="w-[140px] h-8">
                      <Badge variant="outline" className={`${STATUS_COLORS[apt.status]} text-[10px]`}>
                        {STATUS_LABELS[apt.status]}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant="outline" className={`text-[10px] ${apt.reminder_48h_sent ? "bg-green-50 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                      48h {apt.reminder_48h_sent ? "✓" : "—"}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${apt.reminder_24h_sent ? "bg-green-50 text-green-600" : "bg-secondary text-muted-foreground"}`}>
                      24h {apt.reminder_24h_sent ? "✓" : "—"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {(apt as any).google_calendar_event_id ? (
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">
                      <Check className="h-3 w-3 mr-0.5" /> Sync
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); syncToGoogle.mutate(apt.id); }}
                      disabled={syncToGoogle.isPending}
                    >
                      <CalendarSync className="h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    {apt.leads?.phone && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => openWhatsApp(apt.leads!.phone, `Olá ${apt.leads!.name}, lembrando do seu agendamento em ${formatDate(apt.scheduled_at)} às ${formatTime(apt.scheduled_at)} na clínica. Confirma presença?`)}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(apt.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {appointments.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhum agendamento encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

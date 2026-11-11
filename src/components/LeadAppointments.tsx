import { useAppointments, useUpdateAppointment, type AppointmentWithLead } from "@/hooks/useAppointments";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";

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
  leadId: string;
}

export function LeadAppointments({ leadId }: Props) {
  const { data: allAppointments = [], isLoading } = useAppointments();
  const updateMutation = useUpdateAppointment();

  const appointments = useMemo(
    () => allAppointments.filter(a => a.lead_id === leadId),
    [allAppointments, leadId]
  );

  const handleStatusChange = (id: string, status: string) => {
    updateMutation.mutate({ id, status } as any, {
      onSuccess: () => toast.success("Status atualizado!"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (isLoading) return <p className="text-xs text-muted-foreground">Carregando agendamentos...</p>;

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" /> Agendamentos
      </label>
      {appointments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Nenhum agendamento para este lead.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="text-xs h-8">Data</TableHead>
                <TableHead className="text-xs h-8">Horário</TableHead>
                <TableHead className="text-xs h-8">Procedimento</TableHead>
                <TableHead className="text-xs h-8">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map(apt => (
                <TableRow key={apt.id}>
                  <TableCell className="text-xs py-2">{formatDate(apt.scheduled_at)}</TableCell>
                  <TableCell className="text-xs py-2">{formatTime(apt.scheduled_at)}</TableCell>
                  <TableCell className="text-xs py-2 text-muted-foreground">{apt.procedure_name}</TableCell>
                  <TableCell className="py-2">
                    <Select value={apt.status} onValueChange={v => handleStatusChange(apt.id, v)}>
                      <SelectTrigger className="w-[120px] h-7">
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

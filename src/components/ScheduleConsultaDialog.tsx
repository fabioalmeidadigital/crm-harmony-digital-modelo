import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScheduleConsultaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  procedure: string;
  onConfirm: () => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) => {
  const h = i + 8; // 8h to 18h
  return { value: h.toString().padStart(2, "0"), label: `${h.toString().padStart(2, "0")}:00` };
});

const MINUTES = ["00", "15", "30", "45"];

export function ScheduleConsultaDialog({ open, onOpenChange, leadId, leadName, procedure, onConfirm }: ScheduleConsultaDialogProps) {
  const [date, setDate] = useState<Date | undefined>();
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("00");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!date) {
      toast.error("Selecione uma data para a consulta.");
      return;
    }

    setSaving(true);

    const scheduledAt = new Date(date);
    scheduledAt.setHours(parseInt(hour), parseInt(minute), 0, 0);

    // Check for duplicate appointment on same day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("lead_id", leadId)
      .neq("status", "cancelado")
      .gte("scheduled_at", dayStart.toISOString())
      .lte("scheduled_at", dayEnd.toISOString());

    if (existing && existing.length > 0) {
      toast.error("Este paciente já possui agendamento nesta data. Escolha outra data.");
      setSaving(false);
      return;
    }

    // Create appointment
    const { error } = await supabase.from("appointments").insert({
      lead_id: leadId,
      procedure_name: procedure,
      scheduled_at: scheduledAt.toISOString(),
      status: "pendente",
      notes: `Consulta agendada para ${leadName}`,
    });

    if (error) {
      toast.error("Erro ao criar agendamento: " + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onOpenChange(false);
    setDate(undefined);
    setHour("10");
    setMinute("00");
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Consulta</DialogTitle>
          <DialogDescription>
            Selecione a data e horário da consulta de <strong>{leadName}</strong> ({procedure}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Data da Consulta *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Horário *</label>
            <div className="flex gap-2 items-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => (
                    <SelectItem key={h.value} value={h.value}>{h.value}h</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground font-bold">:</span>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!date || saving}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {saving ? "Agendando..." : "Confirmar Agendamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

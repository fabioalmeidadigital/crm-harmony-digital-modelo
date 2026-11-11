import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAppointmentDialog({ open, onOpenChange }: Props) {
  const createMutation = useCreateAppointment();
  const [leadId, setLeadId] = useState("");
  const [procedure, setProcedure] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id, name, phone").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("procedures").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !procedure || !date || !time) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Check for duplicate appointment on same day
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;
    const { data: existing } = await supabase
      .from("appointments")
      .select("id, procedure_name, scheduled_at")
      .eq("lead_id", leadId)
      .neq("status", "cancelado")
      .gte("scheduled_at", dayStart)
      .lte("scheduled_at", dayEnd);

    if (existing && existing.length > 0) {
      toast.error(`Este paciente já possui agendamento nesta data. Escolha outra data ou cancele o existente.`);
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    createMutation.mutate(
      { lead_id: leadId, procedure_name: procedure, scheduled_at: scheduledAt, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("Agendamento criado!");
          setLeadId(""); setProcedure(""); setDate(""); setTime(""); setNotes("");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
          <DialogDescription>Agende uma consulta ou procedimento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Paciente (Lead) *</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
              <SelectContent>
                {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Procedimento *</Label>
            <Select value={procedure} onValueChange={setProcedure}>
              <SelectTrigger><SelectValue placeholder="Selecione o procedimento" /></SelectTrigger>
              <SelectContent>
                {procedures.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações sobre o agendamento..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Agendar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

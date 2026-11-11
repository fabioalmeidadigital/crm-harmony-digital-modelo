import { useState } from "react";
import { useDoctorAvailability, useCreateAvailability, useDeleteAvailability, useUpdateAvailability, getDayName } from "@/hooks/useDoctorAvailability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

export function AdminAvailability() {
  const { data: slots, isLoading } = useDoctorAvailability();
  const createSlot = useCreateAvailability();
  const deleteSlot = useDeleteAvailability();
  const updateSlot = useUpdateAvailability();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ day_of_week: "1", start_time: "08:00", end_time: "18:00" });

  const handleCreate = () => {
    if (form.start_time >= form.end_time) return toast.error("Horário inicial deve ser menor que o final");
    createSlot.mutate({ day_of_week: parseInt(form.day_of_week), start_time: form.start_time, end_time: form.end_time }, {
      onSuccess: () => { setOpen(false); toast.success("Horário adicionado!"); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Clock className="h-5 w-5" /> Disponibilidade do profissional</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Horário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Horário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Dia da Semana</Label>
                <Select value={form.day_of_week} onValueChange={v => setForm(f => ({ ...f, day_of_week: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6].map(d => <SelectItem key={d} value={String(d)}>{getDayName(d)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
                <div><Label>Fim</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createSlot.isPending}>Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots?.map(slot => (
              <TableRow key={slot.id}>
                <TableCell className="font-medium">{getDayName(slot.day_of_week)}</TableCell>
                <TableCell>{slot.start_time?.slice(0, 5)}</TableCell>
                <TableCell>{slot.end_time?.slice(0, 5)}</TableCell>
                <TableCell>
                  <Switch checked={slot.is_active} onCheckedChange={checked => updateSlot.mutate({ id: slot.id, is_active: checked })} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => deleteSlot.mutate(slot.id, { onSuccess: () => toast.success("Horário removido") })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!slots?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum horário cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { formatDateTime } from "@/lib/whatsapp";

export function AdminNotes() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ lead_id: "", content: "", author: "" });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["admin-notes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_notes").select("*, leads(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["admin-leads-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("lead_notes").update({ content: form.content, author: form.author, lead_id: form.lead_id }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lead_notes").insert({ content: form.content, author: form.author, lead_id: form.lead_id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-notes"] }); toast.success("Salvo!"); setDialogOpen(false); setEditId(null); setForm({ lead_id: "", content: "", author: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-notes"] }); toast.success("Excluído!"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Notas de Leads</CardTitle>
        <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1"
          onClick={() => { setEditId(null); setForm({ lead_id: "", content: "", author: "" }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova Nota
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead>Lead</TableHead><TableHead>Conteúdo</TableHead><TableHead>Autor</TableHead>
                <TableHead>Data</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((n: any) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.leads?.name || "—"}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{n.content}</TableCell>
                  <TableCell>{n.author}</TableCell>
                  <TableCell>{formatDateTime(n.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditId(n.id); setForm({ lead_id: n.lead_id, content: n.content, author: n.author }); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Excluir esta nota?")) deleteMutation.mutate(n.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {notes.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma nota cadastrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Nota" : "Nova Nota"}</DialogTitle>
            <DialogDescription>Associe uma nota a um lead.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
            <div className="space-y-1">
              <Label>Lead *</Label>
              <Select value={form.lead_id} onValueChange={v => setForm(p => ({ ...p, lead_id: v }))} required>
                <SelectTrigger><SelectValue placeholder="Selecione o lead" /></SelectTrigger>
                <SelectContent>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Autor *</Label><Input value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Conteúdo *</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} required /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={saveMutation.isPending}>Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

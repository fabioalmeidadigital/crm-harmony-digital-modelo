import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { formatDate } from "@/lib/whatsapp";
import { PIPELINE_STAGES, PIPE1_STAGES, PIPE2_STAGES, SPECIAL_STAGES, PAYMENT_STATUSES, PAYMENT_METHODS, DISQUALIFICATION_REASONS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";


type LeadForm = {
  name: string; phone: string; email: string; age: string; city: string;
  source: string; procedure: string; stage: string;
  payment_status: string; payment_amount: string; payment_method: string; payment_date: string; payment_notes: string; payment_procedure: string;
  disqualification_reason: string;
};

const emptyForm: LeadForm = {
  name: "", phone: "", email: "", age: "", city: "", source: "", procedure: "", stage: "novo_lead",
  payment_status: "pendente", payment_amount: "", payment_method: "", payment_date: "", payment_notes: "", payment_procedure: "",
  disqualification_reason: "none",
};

export function AdminLeads() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<LeadForm>(emptyForm);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["admin-sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_sources").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ["admin-procedures"],
    queryFn: async () => {
      const { data, error } = await supabase.from("procedures").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, phone: form.phone, email: form.email || null,
        age: form.age ? parseInt(form.age) : null, city: form.city || null,
        source: form.source, procedure: form.procedure,
        stage: form.stage as any,
        payment_status: form.payment_status,
        payment_amount: form.payment_amount ? parseFloat(form.payment_amount.replace(",", ".")) : null,
        payment_method: form.payment_method || null,
        payment_date: form.payment_date ? new Date(form.payment_date).toISOString() : null,
        payment_notes: form.payment_notes || null,
        payment_procedure: form.payment_procedure || null,
        disqualification_reason: form.disqualification_reason === "none" ? null : form.disqualification_reason,
        disqualified_at: form.disqualification_reason === "none" ? null : new Date().toISOString(),
      };
      if (editId) {
        const { error } = await supabase.from("leads").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leads").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success(editId ? "Lead atualizado!" : "Lead cadastrado!");
      setDialogOpen(false); setEditId(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-leads"] }); toast.success("Lead excluído!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (lead: any) => {
    setEditId(lead.id);
    setForm({
      name: lead.name, phone: lead.phone, email: lead.email || "",
      age: lead.age?.toString() || "", city: lead.city || "",
      source: lead.source, procedure: lead.procedure, stage: lead.stage,
      payment_status: lead.payment_status || "pendente",
      payment_amount: lead.payment_amount?.toString() || "",
      payment_method: lead.payment_method || "",
      payment_date: lead.payment_date ? new Date(lead.payment_date).toISOString().slice(0, 16) : "",
      payment_notes: lead.payment_notes || "",
      payment_procedure: lead.payment_procedure || "",
      disqualification_reason: lead.disqualification_reason || "none",
    });
    setDialogOpen(true);
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Leads</CardTitle>
        <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1"
          onClick={() => { setEditId(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead>Origem</TableHead>
                  <TableHead>Procedimento</TableHead><TableHead>Etapa</TableHead>
                  <TableHead>Pagamento</TableHead><TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map(lead => {
                  const ps = PAYMENT_STATUSES.find(p => p.id === (lead.payment_status || "pendente"));
                  return (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell>{lead.procedure}</TableCell>
                    <TableCell>{PIPELINE_STAGES.find(s => s.id === lead.stage)?.label || lead.stage}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="outline" className={`text-[10px] w-fit ${ps?.color || ""}`}>{ps?.label || "—"}</Badge>
                        {lead.payment_amount != null && (
                          <span className="text-[10px] text-muted-foreground">
                            R$ {Number(lead.payment_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(lead.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(lead)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("Excluir este lead?")) deleteMutation.mutate(lead.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {leads.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum lead cadastrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Lead" : "Novo Lead"}</DialogTitle>
            <DialogDescription>Preencha os dados do lead.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Telefone *</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Idade</Label><Input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Cidade</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Origem *</Label>
                <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))} required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{sources.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Procedimento *</Label>
                <Select value={form.procedure} onValueChange={v => setForm(p => ({ ...p, procedure: v }))} required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{procedures.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Etapa</Label>
                <Select value={form.stage} onValueChange={v => setForm(p => ({ ...p, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">Funil de Leads</div>
                    {PIPE1_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground mt-1">Funil de Vendas</div>
                    {PIPE2_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground mt-1">Outros</div>
                    {SPECIAL_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Lead desqualificado (motivo)</Label>
                <Select value={form.disqualification_reason} onValueChange={v => setForm(p => ({ ...p, disqualification_reason: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Não desqualificado —</SelectItem>
                    {DISQUALIFICATION_REASONS.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ===== Pagamento ===== */}
            <div className="border-t pt-3 mt-2">
              <h4 className="text-sm font-semibold text-foreground mb-2">💰 Pagamento</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Status do Pagamento</Label>
                  <Select value={form.payment_status} onValueChange={v => setForm(p => ({ ...p, payment_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" min="0" placeholder="0,00"
                    value={form.payment_amount}
                    onChange={e => setForm(p => ({ ...p, payment_amount: e.target.value }))} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Procedimento Pago</Label>
                  <Select value={form.payment_procedure} onValueChange={v => setForm(p => ({ ...p, payment_procedure: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o procedimento pago" /></SelectTrigger>
                    <SelectContent>{procedures.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Data do Pagamento</Label>
                  <Input type="datetime-local"
                    value={form.payment_date}
                    onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Observações</Label>
                  <Textarea rows={2} placeholder="Ex: parcelado em 3x, comprovante anexado..."
                    value={form.payment_notes}
                    onChange={e => setForm(p => ({ ...p, payment_notes: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

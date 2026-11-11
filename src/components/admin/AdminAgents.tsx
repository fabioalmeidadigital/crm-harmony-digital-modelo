import { useState } from "react";
import { useAiAgents, useCreateAiAgent, useDeleteAiAgent, useUpdateAiAgent, type AiAgent } from "@/hooks/useAiAgents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Bot, Copy } from "lucide-react";
import { toast } from "sonner";

const PROVIDERS = [
  { value: "gemini", label: "Google Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "custom", label: "Custom" },
];

const MODELS: Record<string, string[]> = {
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  custom: [],
};

const ALL_CAPABILITIES = [
  { id: "search_leads", label: "Buscar Leads" },
  { id: "create_lead", label: "Criar Lead" },
  { id: "update_lead_stage", label: "Mover Pipeline" },
  { id: "add_note", label: "Adicionar Notas" },
  { id: "get_availability", label: "Ver Disponibilidade" },
  { id: "check_slot", label: "Verificar Horário" },
  { id: "create_appointment", label: "Agendar Consulta" },
  { id: "send_message", label: "Enviar Mensagem" },
];

export function AdminAgents() {
  const { data: agents, isLoading } = useAiAgents();
  const createAgent = useCreateAiAgent();
  const deleteAgent = useDeleteAiAgent();
  const updateAgent = useUpdateAiAgent();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    provider: "gemini",
    model: "gemini-2.5-flash",
    system_prompt: "",
    capabilities: [] as string[],
  });

  const handleCreate = () => {
    if (!form.name) return toast.error("Nome é obrigatório");
    createAgent.mutate(form, {
      onSuccess: () => { setOpen(false); resetForm(); toast.success("Agente criado!"); },
    });
  };

  const resetForm = () => setForm({ name: "", description: "", provider: "gemini", model: "gemini-2.5-flash", system_prompt: "", capabilities: [] });

  const toggleCapability = (cap: string) => {
    setForm(f => ({
      ...f,
      capabilities: f.capabilities.includes(cap) ? f.capabilities.filter(c => c !== cap) : [...f.capabilities, cap],
    }));
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent-webhook`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Bot className="h-5 w-5" /> Agentes de IA</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Agente</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Criar Agente de IA</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Assistente de Agendamento" /></div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Agente para agendar consultas..." /></div>
              <div><Label>Provedor</Label>
                <Select value={form.provider} onValueChange={v => setForm(f => ({ ...f, provider: v, model: MODELS[v]?.[0] || "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Modelo</Label>
                {form.provider === "custom" ? (
                  <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="modelo-customizado" />
                ) : (
                  <Select value={form.model} onValueChange={v => setForm(f => ({ ...f, model: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(MODELS[form.provider] || []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div><Label>System Prompt</Label><Textarea value={form.system_prompt} onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))} rows={4} placeholder="Você é um assistente da clínica..." /></div>
              <div><Label>Capacidades</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {ALL_CAPABILITIES.map(cap => (
                    <label key={cap.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.capabilities.includes(cap.id)} onCheckedChange={() => toggleCapability(cap.id)} />
                      {cap.label}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createAgent.isPending}>Criar Agente</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhook URL */}
      <div className="rounded-lg border bg-muted/50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">URL do Webhook (para integração)</p>
            <code className="text-xs break-all">{webhookUrl}</code>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada!"); }}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Provedor</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Capacidades</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents?.map(agent => (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">{agent.name}</TableCell>
                <TableCell><Badge variant="outline">{agent.provider}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{agent.model}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities?.map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch checked={agent.is_active} onCheckedChange={checked => updateAgent.mutate({ id: agent.id, is_active: checked })} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => deleteAgent.mutate(agent.id, { onSuccess: () => toast.success("Agente removido") })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!agents?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum agente cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Conversation } from "@/hooks/useConversations";
import { useLabels } from "@/hooks/useLabels";
import { useLeads } from "@/contexts/LeadsContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Archive, ArchiveRestore, Tag, ExternalLink, User, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { PIPELINE_STAGES } from "@/lib/constants";
import { toast } from "sonner";
import { LeadDetailDialog } from "@/components/LeadDetailDialog";

interface Props {
  conversation: Conversation;
}

export function ContactPanel({ conversation }: Props) {
  const { labels } = useLabels();
  const { leads } = useLeads();
  const lead = conversation.lead_id ? leads.find(l => l.id === conversation.lead_id) ?? null : null;
  const [editOpen, setEditOpen] = useState(false);

  const toggleLabel = async (name: string) => {
    const has = conversation.labels.includes(name);
    const next = has ? conversation.labels.filter(l => l !== name) : [...conversation.labels, name];
    await supabase.from("chat_conversations").update({ labels: next }).eq("id", conversation.id);
    toast.success(has ? "Etiqueta removida" : "Etiqueta adicionada");
  };

  const toggleArchive = async () => {
    await supabase.from("chat_conversations").update({ is_archived: !conversation.is_archived }).eq("id", conversation.id);
    toast.success(conversation.is_archived ? "Conversa restaurada" : "Conversa arquivada");
  };

  const updateStage = async (stage: string) => {
    if (!lead) return;
    await supabase.from("leads").update({ stage: stage as any }).eq("id", lead.id);
    toast.success("Etapa atualizada");
  };

  return (
    <div className="h-full bg-card border-l flex flex-col">
      <div className="h-16 border-b px-5 flex items-center shrink-0">
        <h3 className="font-semibold text-sm text-foreground">Contato & Lead</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Lead info */}
          <div>
            <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">Lead</label>
            {lead ? (
              <div className="mt-1.5 p-3 rounded-lg border bg-secondary/30">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{lead.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditOpen(true)}
                      title="Editar cadastro"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Link to={`/leads/${lead.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir página do lead">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">📱 {lead.phone}</p>
                {lead.email && <p className="text-xs text-muted-foreground mb-1">✉️ {lead.email}</p>}
                <Badge variant="outline" className="mt-1 text-[10px]">{lead.source}</Badge>
                <Badge variant="outline" className="mt-1 ml-1 text-[10px]">{lead.procedure}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 gap-2 h-8 text-xs"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3 w-3" /> Editar dados do lead
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1.5">Nenhum lead vinculado.</p>
            )}
          </div>

          {/* Etapa do pipeline */}
          {lead && (
            <div>
              <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">Etapa do Pipeline</label>
              <Select value={lead.stage} onValueChange={updateStage}>
                <SelectTrigger className="mt-1.5 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(s => (
                    <SelectItem key={s.id} value={s.id}><span className="text-xs">{s.label}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Etiquetas */}
          <div>
            <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Etiquetas
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {labels.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma etiqueta criada.</p>}
              {labels.map(l => {
                const active = conversation.labels.includes(l.name);
                return (
                  <button
                    key={l.id}
                    onClick={() => toggleLabel(l.name)}
                    className="text-[10px] font-medium px-2 py-1 rounded-md border transition-all"
                    style={active ? {
                      background: l.color, color: "#fff", borderColor: l.color,
                    } : {
                      background: `${l.color}15`, color: l.color, borderColor: `${l.color}40`,
                    }}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={toggleArchive}>
              {conversation.is_archived ? <><ArchiveRestore className="h-4 w-4" /> Restaurar</> : <><Archive className="h-4 w-4" /> Arquivar</>}
            </Button>
          </div>
        </div>
      </ScrollArea>

      <LeadDetailDialog lead={lead as any} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

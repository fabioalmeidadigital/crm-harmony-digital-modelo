import { CRMLayout } from "@/components/CRMLayout";
import { useLeads } from "@/contexts/LeadsContext";
import { useParams, useNavigate } from "react-router-dom";
import { PIPELINE_STAGES, SOURCE_COLORS } from "@/lib/constants";
import { formatPhone, formatDateTime } from "@/lib/whatsapp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Phone, Mail, MapPin, User, Clock } from "lucide-react";
import { StartWhatsAppButton } from "@/components/inbox/StartWhatsAppButton";
import { LeadConversationsHistory } from "@/components/LeadConversationsHistory";
import { useState } from "react";
import { toast } from "sonner";

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leads, updateLead, moveLead, addNote, getLeadNotes } = useLeads();
  const [noteContent, setNoteContent] = useState("");

  const lead = leads.find(l => l.id === id);
  if (!lead) {
    return (
      <CRMLayout title="Lead não encontrado">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">Lead não encontrado.</p>
          <Button variant="outline" onClick={() => navigate("/leads")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </CRMLayout>
    );
  }

  const notes = getLeadNotes(lead.id);
  const currentStage = PIPELINE_STAGES.find(s => s.id === lead.stage);

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addNote(lead.id, noteContent.trim(), "Equipe");
    setNoteContent("");
    toast.success("Nota adicionada!");
  };

  return (
    <CRMLayout title="">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-foreground">{lead.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={SOURCE_COLORS[lead.source] || ""}>
                  {lead.source}
                </Badge>
                <Badge variant="secondary">{currentStage?.label}</Badge>
              </div>
            </div>
          </div>
          <StartWhatsAppButton lead={lead} label="Iniciar conversa" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-sm">Informações</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {formatPhone(lead.phone)}
                </div>
                {lead.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /> {lead.email}
                  </div>
                )}
                {lead.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {lead.city}
                  </div>
                )}
                {lead.age && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" /> {lead.age} anos
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" /> {formatDateTime(lead.created_at)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-sm">Procedimento</CardTitle></CardHeader>
              <CardContent>
                <Badge className="bg-accent/10 text-accent border-accent/20">{lead.procedure}</Badge>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-sm">Etapa do Pipeline</CardTitle></CardHeader>
              <CardContent>
                <Select value={lead.stage} onValueChange={val => moveLead(lead.id, val as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {(lead.utm_source || lead.utm_campaign || lead.utm_medium || lead.referrer || lead.landing_page) && (
              <Card className="border-none shadow-sm">
                <CardHeader><CardTitle className="text-sm">Origem & Campanha</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {lead.utm_source && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Source</span>
                      <Badge variant="secondary" className="font-mono">{lead.utm_source}</Badge>
                    </div>
                  )}
                  {lead.utm_medium && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Medium</span>
                      <span className="font-mono">{lead.utm_medium}</span>
                    </div>
                  )}
                  {lead.utm_campaign && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Campanha</span>
                      <span className="font-mono text-right break-all">{lead.utm_campaign}</span>
                    </div>
                  )}
                  {lead.utm_term && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Term</span>
                      <span className="font-mono text-right break-all">{lead.utm_term}</span>
                    </div>
                  )}
                  {lead.utm_content && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Content</span>
                      <span className="font-mono text-right break-all">{lead.utm_content}</span>
                    </div>
                  )}
                  {lead.referrer && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground block">Referrer</span>
                      <span className="break-all text-[10px]">{lead.referrer}</span>
                    </div>
                  )}
                  {lead.landing_page && (
                    <div>
                      <span className="text-muted-foreground block">Landing page</span>
                      <span className="break-all text-[10px]">{lead.landing_page}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-sm">Conversas</CardTitle></CardHeader>
              <CardContent>
                <LeadConversationsHistory leadId={lead.id} />
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Histórico / Notas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicionar uma nota..."
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <Button onClick={handleAddNote} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Adicionar Nota
                </Button>

                <div className="border-t pt-4 space-y-3">
                  {notes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota ainda.</p>
                  )}
                  {notes.map(note => (
                    <div key={note.id} className="p-3 rounded-lg bg-secondary/50 border-l-2 border-accent">
                      <p className="text-sm text-foreground">{note.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">{note.author}</span>
                        <span>•</span>
                        <span>{formatDateTime(note.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}

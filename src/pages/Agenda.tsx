import { CRMLayout } from "@/components/CRMLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { AgendaList } from "@/components/agenda/AgendaList";
import { NewAppointmentDialog } from "@/components/agenda/NewAppointmentDialog";
import { GoogleCalendarSync } from "@/components/agenda/GoogleCalendarSync";
import { LeadDetailDialog } from "@/components/LeadDetailDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, useCallback } from "react";
import { useLeads } from "@/contexts/LeadsContext";
import type { Lead } from "@/lib/types";

export default function Agenda() {
  const [newOpen, setNewOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { leads } = useLeads();

  const handleSelectLead = useCallback((leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setSelectedLead(lead);
      setDetailOpen(true);
    }
  }, [leads]);

  return (
    <CRMLayout title="Agenda">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Tabs defaultValue="calendar" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <TabsList className="bg-card border">
                  <TabsTrigger value="calendar">Calendário</TabsTrigger>
                  <TabsTrigger value="list">Lista</TabsTrigger>
                </TabsList>
                <GoogleCalendarSync />
              </div>
              <Button onClick={() => setNewOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                <Plus className="h-4 w-4" /> Novo Agendamento
              </Button>
            </div>
            <TabsContent value="calendar"><AgendaCalendar onSelectLead={handleSelectLead} /></TabsContent>
            <TabsContent value="list"><AgendaList onSelectLead={handleSelectLead} /></TabsContent>
          </Tabs>
        </div>
      </div>
      <NewAppointmentDialog open={newOpen} onOpenChange={setNewOpen} />
      <LeadDetailDialog lead={selectedLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </CRMLayout>
  );
}

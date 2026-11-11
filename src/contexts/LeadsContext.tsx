import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Lead, LeadNote } from "@/lib/types";
import type { PipelineStage } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadsContextType {
  leads: Lead[];
  notes: LeadNote[];
  loading: boolean;
  error: string | null;
  addLead: (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLead: (id: string, stage: PipelineStage) => void;
  addNote: (leadId: string, content: string, author: string) => void;
  getLeadNotes: (leadId: string) => LeadNote[];
  refreshLeads: () => void;
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const reqId = React.useRef(0);

  const fetchLeads = useCallback(async () => {
    const my = ++reqId.current;
    const PAGE = 1000;
    for (let attempt = 0; attempt < 3; attempt++) {
      const all: Lead[] = [];
      let failed: any = null;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) { failed = error; break; }
        all.push(...((data || []) as Lead[]));
        if (!data || data.length < PAGE) break;
      }
      if (my !== reqId.current) return; // a newer request superseded this one
      if (!failed) {
        setLeads(all);
        setError(null);
        setLoading(false);
        return;
      }
      console.error("Error fetching leads:", failed);
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
    if (my !== reqId.current) return;
    setError("Não foi possível carregar os contatos.");
    setLoading(false);
  }, []);

  const fetchNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("lead_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return;
    }
    setNotes((data || []) as LeadNote[]);
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchNotes();

    // Realtime: aplica só a linha alterada (antes recarregava todos os ~4 mil leads a cada mudança)
    const leadsChannel = supabase
      .channel(`leads-changes-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, (payload: any) => {
        if (payload.eventType === "DELETE") {
          const id = payload.old?.id;
          setLeads(prev => prev.filter(l => l.id !== id));
        } else if (payload.new?.id) {
          const row = payload.new as Lead;
          setLeads(prev => {
            const i = prev.findIndex(l => l.id === row.id);
            if (i === -1) return [row, ...prev];
            const next = prev.slice();
            next[i] = { ...prev[i], ...row };
            return next;
          });
        }
      })
      .subscribe();
    const notesChannel = supabase
      .channel("lead-notes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_notes" }, () => fetchNotes())
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(notesChannel);
    };
  }, [fetchLeads, fetchNotes]);

  const addLead = useCallback(async (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => {
    const { error } = await supabase.from("leads").insert({
      name: lead.name,
      phone: lead.phone,
      email: lead.email || null,
      age: lead.age || null,
      city: lead.city || null,
      source: lead.source,
      procedure: lead.procedure,
      stage: lead.stage,
    });

    if (error) {
      toast.error("Erro ao cadastrar lead: " + error.message);
      return;
    }
    toast.success("Lead cadastrado!");
    fetchLeads();
  }, [fetchLeads]);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    const { error } = await supabase.from("leads").update(updates as any).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar lead: " + error.message);
      fetchLeads();
    }
  }, [fetchLeads]);

  const moveLead = useCallback(async (id: string, stage: PipelineStage) => {
    const { error } = await supabase.from("leads").update({ stage }).eq("id", id);
    if (error) {
      toast.error("Erro ao mover lead: " + error.message);
      return;
    }
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage, updated_at: new Date().toISOString() } : l));
  }, []);

  const addNote = useCallback(async (leadId: string, content: string, author: string) => {
    const { error } = await supabase.from("lead_notes").insert({
      lead_id: leadId,
      content,
      author,
    });

    if (error) {
      toast.error("Erro ao adicionar nota: " + error.message);
      return;
    }
    fetchNotes();
  }, [fetchNotes]);

  const getLeadNotes = useCallback((leadId: string) => {
    return notes.filter(n => n.lead_id === leadId).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notes]);

  return (
    <LeadsContext.Provider value={{ leads, notes, loading, error, addLead, updateLead, moveLead, addNote, getLeadNotes, refreshLeads: fetchLeads }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}

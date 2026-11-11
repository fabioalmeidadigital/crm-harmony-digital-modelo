import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  channel: string;
  whatsapp_number: string | null;
  contact_name: string | null;
  avatar_url: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  is_archived: boolean;
  labels: string[];
  status: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  direction: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  status: string;
  sender_name: string | null;
  created_at: string;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("channel", "whatsapp")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    setConversations((data as Conversation[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("conversations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, (payload: any) => {
        // Aplica só a conversa alterada (antes recarregava todas a cada mudança)
        if (payload.eventType === "DELETE") {
          setConversations(prev => prev.filter(c => c.id !== payload.old?.id));
          return;
        }
        const row = payload.new as Conversation;
        if (!row?.id || row.channel !== "whatsapp") return;
        setConversations(prev => {
          const others = prev.filter(c => c.id !== row.id);
          const merged = { ...(prev.find(c => c.id === row.id) || {}), ...row } as Conversation;
          return [merged, ...others].sort((a, b) =>
            (b.last_message_at || "").localeCompare(a.last_message_at || ""));
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
    await supabase.from("chat_conversations").update({ unread_count: 0 }).eq("id", id);
  }, []);

  return { conversations, loading, reload: load, markRead };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!conversationId) { setMessages([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at");
    setMessages((data as Message[]) || []);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    load();
    if (!conversationId) return;
    const ch = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages(prev => {
            // Evita duplicar se já existir (ex.: já inserido pela própria UI)
            if (prev.some(m => m.id === incoming.id)) return prev;
            // Substitui mensagem otimista equivalente (mesmo conteúdo + outbound recente)
            const optimisticIdx = prev.findIndex(m =>
              m.id.startsWith("optimistic-") &&
              m.direction === incoming.direction &&
              m.content === incoming.content
            );
            if (optimisticIdx >= 0) {
              const next = [...prev];
              next[optimisticIdx] = incoming;
              return next;
            }
            return [...prev, incoming];
          });
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, load]);

  const markAsRead = useCallback(async () => {
    if (!conversationId) return;
    await supabase.from("chat_conversations").update({ unread_count: 0 }).eq("id", conversationId);
  }, [conversationId]);

  const addOptimistic = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  return { messages, loading, reload: load, markAsRead, addOptimistic, updateMessage, removeMessage };
}

export interface SendPayload {
  content?: string;
  media_url?: string;
  media_type?: "image" | "video" | "audio" | "document";
  media_name?: string;
  caption?: string;
}

export async function sendMessage(conversationId: string, payload: string | SendPayload) {
  const body =
    typeof payload === "string"
      ? { conversation_id: conversationId, content: payload }
      : { conversation_id: conversationId, ...payload };
  const { data, error } = await supabase.functions.invoke("whatsapp-send", { body });
  if (error) throw error;
  return data;
}

export async function findOrCreateWhatsAppConversation(lead: { id: string; name: string; phone: string }) {
  const cleanPhone = lead.phone.replace(/\D/g, "");
  const { data: existing, error: findError } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("channel", "whatsapp")
    .or(`lead_id.eq.${lead.id},whatsapp_number.eq.${cleanPhone}`)
    .maybeSingle();

  if (findError) throw findError;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({
      channel: "whatsapp",
      lead_id: lead.id,
      contact_name: lead.name,
      whatsapp_number: cleanPhone,
      status: "open",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

// Faz upload de um File para o bucket whatsapp-media e retorna URL pública
export async function uploadMedia(file: File, conversationId: string): Promise<{ url: string; name: string }> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `outbound/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("whatsapp-media").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
  return { url: data.publicUrl, name: file.name };
}

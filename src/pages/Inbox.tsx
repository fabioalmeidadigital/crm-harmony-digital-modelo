import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CRMLayout } from "@/components/CRMLayout";
import { useConversations } from "@/hooks/useConversations";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { ConversationsList } from "@/components/inbox/ConversationsList";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { ContactPanel } from "@/components/inbox/ContactPanel";
import { Button } from "@/components/ui/button";
import { MessageCircle, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Inbox() {
  const { conversations: allConversations, loading, markRead } = useConversations();
  const { instances } = useWhatsAppInstances();
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(true);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  // Seleciona automaticamente a primeira instância ao carregar
  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances, selectedInstanceId]);

  // Filtra conversas pela instância selecionada (inclui conversas legadas sem instance_id na primeira instância)
  const conversations = selectedInstanceId
    ? allConversations.filter(c => {
        const cid = (c as any).whatsapp_instance_id;
        if (cid === selectedInstanceId) return true;
        // Conversas antigas sem instance_id ficam atreladas à primeira instância
        if (!cid && instances[0]?.id === selectedInstanceId) return true;
        return false;
      })
    : allConversations;

  useEffect(() => {
    const requestedConversation = searchParams.get("conversation");
    if (requestedConversation && conversations.some(c => c.id === requestedConversation)) {
      setSelectedId(requestedConversation);
      return;
    }
    if (!selectedId && conversations.length > 0) setSelectedId(conversations[0].id);
  }, [conversations, selectedId, searchParams]);

  // Reset seleção ao trocar de instância se a conversa não pertence
  useEffect(() => {
    if (selectedId && !conversations.some(c => c.id === selectedId)) {
      setSelectedId(conversations[0]?.id ?? null);
    }
  }, [selectedInstanceId, conversations, selectedId]);

  const selected = conversations.find(c => c.id === selectedId) || null;

  const activeInstance = instances.find(i => i.id === selectedInstanceId);
  const title = activeInstance?.phone_number
    ? `Inbox WhatsApp (${activeInstance.phone_number})`
    : activeInstance
      ? `Inbox WhatsApp (${activeInstance.name})`
      : "Inbox WhatsApp";

  // Layout responsivo:
  // - Mobile (<md): mostra UMA coluna por vez (lista OU chat)
  // - md a xl: lista 360px + chat (sem painel de contato — abre como overlay)
  // - xl+: lista 360px + chat + contato 360px (toggle)
  const cols = contactOpen
    ? "grid-cols-1 md:grid-cols-[360px_1fr] xl:grid-cols-[360px_1fr_360px]"
    : "grid-cols-1 md:grid-cols-[360px_1fr]";

  return (
    <CRMLayout title={title}>
      <div className={`-m-6 h-full min-h-0 grid ${cols} bg-background overflow-hidden`}>
        {/* Lista — esconde no mobile quando uma conversa está aberta */}
        <div className={selected ? "hidden md:block min-h-0" : "block min-h-0"}>
          {instances.length > 1 && (
            <div className="p-2 border-b bg-card flex gap-1 overflow-x-auto">
              {instances.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => setSelectedInstanceId(inst.id)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
                    selectedInstanceId === inst.id
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                  )}
                  title={inst.phone_number || inst.name}
                >
                  <Smartphone className="h-3 w-3" />
                  {inst.name}
                  {inst.phone_number && <span className="opacity-70">· {inst.phone_number.slice(-4)}</span>}
                </button>
              ))}
            </div>
          )}
          <ConversationsList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); markRead(id); }}
          />
        </div>

        {/* Chat */}
        <div className={selected ? "block min-h-0" : "hidden md:block min-h-0"}>
          {selected ? (
            <ChatPanel
              conversation={selected}
              onBack={() => setSelectedId(null)}
              onToggleContact={() => setContactOpen(o => !o)}
              contactOpen={contactOpen}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-secondary/20 text-muted-foreground">
              <MessageCircle className="h-14 w-14 mb-3 opacity-30" />
              <p className="text-sm">{loading ? "Carregando conversas..." : "Selecione uma conversa para começar"}</p>
            </div>
          )}
        </div>

        {/* Painel de contato — só em xl, e quando contactOpen */}
        {selected && contactOpen && (
          <div className="hidden xl:block min-h-0">
            <ContactPanel conversation={selected} />
          </div>
        )}
      </div>
    </CRMLayout>
  );
}

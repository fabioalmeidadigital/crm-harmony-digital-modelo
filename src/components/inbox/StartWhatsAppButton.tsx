import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { findOrCreateWhatsAppConversation, type Conversation } from "@/hooks/useConversations";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChatPanel } from "@/components/inbox/ChatPanel";
import { ContactPanel } from "@/components/inbox/ContactPanel";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface StartWhatsAppButtonProps {
  lead: Pick<Lead, "id" | "name" | "phone">;
  label?: string;
  size?: "sm" | "default" | "icon";
  className?: string;
  iconOnly?: boolean;
  onStarted?: () => void;
  /** Quando true, abre o chat em um popup ao invés de navegar para /inbox */
  openInDialog?: boolean;
}

export function StartWhatsAppButton({
  lead,
  label = "Iniciar conversa",
  size = "default",
  className,
  iconOnly = false,
  onStarted,
  openInDialog = false,
}: StartWhatsAppButtonProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dialogConv, setDialogConv] = useState<Conversation | null>(null);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setLoading(true);
    try {
      const conversationId = await findOrCreateWhatsAppConversation(lead);
      onStarted?.();
      if (openInDialog) {
        const { data, error } = await supabase
          .from("chat_conversations")
          .select("*")
          .eq("id", conversationId)
          .single();
        if (error) throw error;
        await supabase.from("chat_conversations").update({ unread_count: 0 }).eq("id", conversationId);
        setDialogConv(data as Conversation);
      } else {
        navigate(`/inbox?conversation=${conversationId}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a conversa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Button
      size={size}
      type="button"
      className={cn(
        "bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 gap-2",
        iconOnly && "px-0",
        className
      )}
      onClick={handleClick}
      disabled={loading}
      title={label}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      {!iconOnly && <span>{label}</span>}
    </Button>
      {openInDialog && (
        <Dialog open={!!dialogConv} onOpenChange={(o) => { if (!o) setDialogConv(null); }}>
          <DialogContent
            className="max-w-6xl w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DialogTitle className="sr-only">Conversa WhatsApp com {lead.name}</DialogTitle>
            {dialogConv && (
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_340px]">
                <div className="min-h-0">
                  <ChatPanel conversation={dialogConv} />
                </div>
                <div className="min-h-0 hidden md:block">
                  <ContactPanel conversation={dialogConv} />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
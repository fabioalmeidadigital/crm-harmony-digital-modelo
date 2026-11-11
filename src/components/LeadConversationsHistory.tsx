import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, ArrowRight } from "lucide-react";
import { formatDateTime } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

interface Conv {
  id: string;
  channel: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  msg_count: number;
}

export function LeadConversationsHistory({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: convs } = await supabase
        .from("chat_conversations")
        .select("id, channel, last_message_at, last_message_preview, created_at")
        .eq("lead_id", leadId)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      const list = convs || [];
      const counts = await Promise.all(
        list.map(async (c) => {
          const { count } = await supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", c.id);
          return { ...c, msg_count: count || 0 };
        })
      );
      if (active) {
        setItems(counts);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [leadId]);

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-2 block">
        Histórico de conversas
      </label>
      {loading ? (
        <p className="text-xs text-muted-foreground py-2">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nenhuma conversa registrada.</p>
      ) : (
        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          {items.map((c) => (
            <Link
              key={c.id}
              to={`/inbox?conversation=${c.id}`}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition"
            >
              <MessageCircle className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="uppercase font-medium">{c.channel}</span>
                  <span>{c.msg_count} msg{c.msg_count !== 1 ? "s" : ""}</span>
                </div>
                {c.last_message_preview && (
                  <p className="text-xs text-foreground line-clamp-1 mt-0.5">
                    {c.last_message_preview}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {c.last_message_at ? formatDateTime(c.last_message_at) : formatDateTime(c.created_at)}
                </p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground self-center shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

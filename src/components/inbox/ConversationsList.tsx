import { Conversation } from "@/hooks/useConversations";
import { useLabels } from "@/hooks/useLabels";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, MessageCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "Não lidas" },
  { id: "archived", label: "Arquivadas" },
] as const;

export function ConversationsList({ conversations, selectedId, onSelect }: Props) {
  const { labels } = useLabels();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<typeof FILTERS[number]["id"]>("all");

  const filtered = useMemo(() => {
    return conversations.filter(c => {
      if (filter === "unread" && c.unread_count === 0) return false;
      if (filter === "archived" && !c.is_archived) return false;
      if (filter !== "archived" && c.is_archived) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (c.contact_name || "").toLowerCase();
        const phone = (c.whatsapp_number || "").toLowerCase();
        const preview = (c.last_message_preview || "").toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !preview.includes(q)) return false;
      }
      return true;
    });
  }, [conversations, filter, search]);

  const labelMap = useMemo(() => Object.fromEntries(labels.map(l => [l.name, l])), [labels]);

  const hasUnread = useMemo(
    () => conversations.some(c => c.unread_count > 0 && !c.is_archived),
    [conversations]
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-card border-r">
      <div className="p-3 border-b space-y-3 shrink-0">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "relative px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/70"
              )}
            >
              {f.label}
              {f.id === "unread" && hasUnread && filter !== "unread" && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card" />
              )}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma conversa</p>
          </div>
        )}
        {filtered.map(c => {
          const isSelected = c.id === selectedId;
          const initials = (c.contact_name || c.whatsapp_number || "?").slice(0, 2).toUpperCase();
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "w-full flex gap-3 p-3 border-b border-border/50 text-left transition-colors hover:bg-secondary/50",
                isSelected && "bg-secondary"
              )}
            >
              <div className="h-10 w-10 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center shrink-0 overflow-hidden">
                {c.avatar_url ? (
                  <img
                    src={c.avatar_url}
                    alt={c.contact_name || "contato"}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-foreground truncate">
                    {c.contact_name || c.whatsapp_number || "Sem nome"}
                  </span>
                  {c.last_message_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(c.last_message_at), { locale: ptBR, addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {c.last_message_preview || "—"}
                  </p>
                  {c.unread_count > 0 && (
                    <Badge className="h-5 min-w-5 px-1.5 bg-accent text-accent-foreground text-[10px] rounded-full shrink-0">
                      {c.unread_count}
                    </Badge>
                  )}
                </div>
                {c.labels.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {c.labels.map(name => {
                      const l = labelMap[name];
                      return (
                        <span
                          key={name}
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: `${l?.color || "#999"}22`, color: l?.color || "#666" }}
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                )}
                {c.last_message_at && (
                  <div className="mt-1 text-[10px] text-muted-foreground/80">
                    Última: {format(new Date(c.last_message_at), "dd/MM/yyyy 'às' HH:mm")}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </ScrollArea>
    </div>
  );
}

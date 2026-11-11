import { useEffect, useRef, useState } from "react";
import { Conversation, useMessages, sendMessage, uploadMedia } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Send, Phone, MessageCircle, Check, CheckCheck, Clock, ArrowLeft,
  PanelRightClose, PanelRightOpen, Paperclip, Mic, X, FileText, Image as ImageIcon, Loader2, Square, Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import EmojiPicker, { EmojiStyle, Theme, EmojiClickData } from "emoji-picker-react";

interface Props {
  conversation: Conversation;
  onBack?: () => void;
  onToggleContact?: () => void;
  contactOpen?: boolean;
}

type PendingFile = {
  file: File;
  type: "image" | "video" | "audio" | "document";
  previewUrl?: string;
};

function detectType(file: File): PendingFile["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

export function ChatPanel({ conversation, onBack, onToggleContact, contactOpen }: Props) {
  const { messages, loading, markAsRead, addOptimistic, updateMessage, removeMessage } = useMessages(conversation.id);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setText(t => t + emoji);
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    if (conversation.unread_count > 0) markAsRead();
  }, [conversation.id, conversation.unread_count, markAsRead]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Limpa preview quando troca de conversa
  useEffect(() => {
    setPending(null);
    setText("");
    stopRecording(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 25MB).");
      return;
    }
    const type = detectType(f);
    const previewUrl = type === "image" || type === "video" ? URL.createObjectURL(f) : undefined;
    setPending({ file: f, type, previewUrl });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearPending = () => {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: mime });
        setPending({ file, type: "audio" });
      };
      rec.start();
      mediaRecRef.current = rec;
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (e) {
      toast.error("Permissão de microfone negada.");
    }
  };

  const stopRecording = (cancel = false) => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    setRecording(false);
    setRecordSeconds(0);
    const rec = mediaRecRef.current;
    if (rec && rec.state !== "inactive") {
      if (cancel) {
        rec.ondataavailable = null;
        rec.onstop = () => rec.stream.getTracks().forEach(t => t.stop());
      }
      rec.stop();
    }
    mediaRecRef.current = null;
  };

  const handleSend = () => {
    if (!text.trim() && !pending) return;

    // Snapshot dos dados e limpa o input IMEDIATAMENTE (UX estilo WhatsApp)
    const sendText = text.trim();
    const sendPending = pending;
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const dbContent = sendText || (
      sendPending?.type === "image" ? "[imagem]" :
      sendPending?.type === "video" ? "[vídeo]" :
      sendPending?.type === "audio" ? "[áudio]" :
      sendPending?.type === "document" ? `[documento: ${sendPending.file.name}]` : ""
    );

    // Adiciona mensagem otimista no chat
    addOptimistic({
      id: optimisticId,
      conversation_id: conversation.id,
      role: "assistant",
      direction: "outbound",
      content: dbContent,
      media_url: sendPending?.previewUrl || null,
      media_type: sendPending?.type || null,
      status: "pending",
      sender_name: "Atendente",
      created_at: new Date().toISOString(),
    });

    // Limpa input na hora
    setText("");
    setPending(null);
    textareaRef.current?.focus();

    // Envia em background
    (async () => {
      try {
        let res;
        if (sendPending) {
          const { url, name } = await uploadMedia(sendPending.file, conversation.id);
          res = await sendMessage(conversation.id, {
            content: sendText || undefined,
            media_url: url,
            media_type: sendPending.type,
            media_name: name,
            caption: sendText || undefined,
          });
          // Libera URL de preview agora que a mídia real chegou
          if (sendPending.previewUrl) URL.revokeObjectURL(sendPending.previewUrl);
        } else {
          res = await sendMessage(conversation.id, sendText);
        }
        if (res?.status === "draft") {
          toast.warning("Mensagem salva como rascunho — Mega API ainda não configurada.");
        }
        // Marca como enviada caso o realtime ainda não tenha substituído
        updateMessage(optimisticId, { status: res?.status === "draft" ? "draft" : "sent" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao enviar";
        toast.error(msg);
        // Remove a mensagem otimista que falhou
        removeMessage(optimisticId);
        // Restaura o texto pra usuário tentar novamente
        if (sendText) setText(sendText);
      }
    })();
  };

  const initials = (conversation.contact_name || conversation.whatsapp_number || "?").slice(0, 2).toUpperCase();

  const renderMediaContent = (m: { media_url: string | null; media_type: string | null; content: string }) => {
    if (!m.media_url || !m.media_type) return null;
    if (m.media_type === "image") {
      return (
        <a href={m.media_url} target="_blank" rel="noreferrer" className="block mb-1">
          <img src={m.media_url} alt="" className="rounded-md max-w-full max-h-64 object-cover" />
        </a>
      );
    }
    if (m.media_type === "video") {
      return <video src={m.media_url} controls className="rounded-md max-w-full max-h-64 mb-1" />;
    }
    if (m.media_type === "audio") {
      return <audio src={m.media_url} controls preload="metadata" className="w-[260px] max-w-full mb-1" />;
    }
    if (m.media_type === "document") {
      return (
        <a href={m.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 mb-1 rounded bg-black/5 hover:bg-black/10 text-xs">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate underline">{m.content.replace(/^\[documento:?\s*|\]$/g, "") || "Documento"}</span>
        </a>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#efeae2] dark:bg-[#0b141a]">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={handlePickFile}
      />

      {/* Header */}
      <div className="h-16 border-b bg-card px-4 md:px-5 flex items-center gap-3 shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 -ml-1" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="h-10 w-10 rounded-full bg-accent/15 text-accent font-semibold flex items-center justify-center shrink-0 overflow-hidden">
          {conversation.avatar_url ? (
            <img
              src={conversation.avatar_url}
              alt={conversation.contact_name || "contato"}
              className="h-full w-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {conversation.contact_name || "Contato sem nome"}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            {conversation.whatsapp_number || "—"}
          </p>
        </div>
        {onToggleContact && (
          <Button variant="ghost" size="icon" className="hidden xl:inline-flex h-9 w-9" onClick={onToggleContact}>
            {contactOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
          </Button>
        )}
      </div>

      {/* Mensagens */}
      <ScrollArea
        className="flex-1 min-h-0 px-5 py-4 [&>[data-radix-scroll-area-viewport]>div]:!block"
        ref={scrollRef as any}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><circle cx='20' cy='20' r='1' fill='%23000' opacity='0.04'/></svg>\")",
        }}
      >
        {loading && <p className="text-center text-xs text-muted-foreground py-4">Carregando...</p>}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        )}
        <div className="space-y-2">
          {messages.map(m => {
            const isOut = m.direction === "outbound";
            const hasMedia = !!m.media_url && !!m.media_type;
            const showText = m.content && !(hasMedia && m.content.startsWith("[") && m.content.endsWith("]"));
            return (
              <div key={m.id} className={cn("flex", isOut ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-lg px-2 py-1.5 text-sm shadow-sm",
                    isOut
                      ? "bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-white rounded-tr-sm"
                      : "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-white rounded-tl-sm"
                  )}
                >
                  {hasMedia && renderMediaContent(m)}
                  {showText && (
                    <p className="whitespace-pre-wrap break-words px-1">{m.content}</p>
                  )}
                  <div className={cn(
                    "flex items-center gap-1 justify-end mt-0.5 text-[10px] px-1",
                    isOut ? "text-[#667781] dark:text-white/60" : "text-[#667781] dark:text-white/50"
                  )}>
                    <span>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    {isOut && (
                      m.status === "read" ? <CheckCheck className="h-3 w-3 text-[#53bdeb]" /> :
                      m.status === "delivered" ? <CheckCheck className="h-3 w-3" /> :
                      m.status === "sent" ? <Check className="h-3 w-3" /> :
                      <Clock className="h-3 w-3" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Preview de anexo pendente */}
      {pending && (
        <div className="border-t bg-card px-3 py-2 flex items-center gap-3 shrink-0">
          <div className="h-14 w-14 rounded bg-secondary flex items-center justify-center overflow-hidden shrink-0">
            {pending.type === "image" && pending.previewUrl
              ? <img src={pending.previewUrl} alt="" className="h-full w-full object-cover" />
              : pending.type === "video" && pending.previewUrl
              ? <video src={pending.previewUrl} className="h-full w-full object-cover" />
              : pending.type === "audio"
              ? <Mic className="h-6 w-6 text-accent" />
              : <FileText className="h-6 w-6 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{pending.file.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {pending.type} • {(pending.file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={clearPending}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 z-10 border-t bg-card p-3 shrink-0">
        {recording ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-md bg-red-50 border border-red-200">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-700">Gravando... {String(Math.floor(recordSeconds / 60)).padStart(2,"0")}:{String(recordSeconds % 60).padStart(2,"0")}</span>
            </div>
            <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => stopRecording(true)} title="Cancelar">
              <X className="h-4 w-4" />
            </Button>
            <Button size="icon" className="h-11 w-11 bg-[#00a884] hover:bg-[#06876b] text-white" onClick={() => stopRecording(false)} title="Parar e anexar">
              <Square className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  title="Emoji"
                >
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="p-0 border-0 bg-transparent shadow-none w-auto"
              >
                <EmojiPicker
                  onEmojiClick={(d: EmojiClickData) => {
                    insertEmoji(d.emoji);
                  }}
                  emojiStyle={EmojiStyle.NATIVE}
                  theme={Theme.AUTO}
                  width={340}
                  height={400}
                  searchPlaceholder="Buscar emoji..."
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                  lazyLoadEmojis
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar arquivo"
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={pending ? "Adicione uma legenda..." : "Digite uma mensagem..."}
              className="min-h-[44px] max-h-32 resize-none text-sm"
              rows={1}
            />
            {!text.trim() && !pending ? (
              <Button
                size="icon"
                className="h-11 w-11 bg-[#00a884] hover:bg-[#06876b] text-white shrink-0"
                onClick={startRecording}
                title="Gravar áudio"
              >
                <Mic className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                size="icon"
                className="h-11 w-11 bg-[#00a884] hover:bg-[#06876b] text-white shrink-0"
                title="Enviar"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

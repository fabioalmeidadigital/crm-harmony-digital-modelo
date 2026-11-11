import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, X, Send, Loader2, Paperclip, Mic, Square, ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Msg = {
  role: "user" | "assistant";
  content: string | ContentPart[];
};

function renderUserContent(content: Msg["content"]) {
  if (typeof content === "string") return <>{content}</>;
  return (
    <div className="space-y-2">
      {content.map((p, i) =>
        p.type === "text" ? (
          <div key={i} className="whitespace-pre-wrap">{p.text}</div>
        ) : (
          <img key={i} src={p.image_url.url} alt="anexo" className="rounded-lg max-h-48 object-contain" />
        ),
      )}
    </div>
  );
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function CrmAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! 👋 Sou o assistente do CRM. Posso ajudar a buscar leads, cadastrar contatos, resumir status, **ler imagens** que você anexar/colar e **transcrever áudios**. Como posso ajudar?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || loading) return;

    let userContent: Msg["content"];
    if (pendingImages.length === 0) {
      userContent = text;
    } else {
      const parts: ContentPart[] = pendingImages.map((url) => ({
        type: "image_url" as const,
        image_url: { url },
      }));
      if (text) parts.push({ type: "text", text });
      userContent = parts;
    }

    const userMsg: Msg = { role: "user", content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingImages([]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("crm-assistant", {
        body: {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      if (data?.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `❌ ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply || "Desculpe, não entendi." }]);
      }
    } catch (e) {
      console.error("Assistant error:", e);
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Erro ao processar. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    const urls = await Promise.all(arr.map(fileToDataUrl));
    setPendingImages(prev => [...prev, ...urls]);
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imgs: File[] = [];
    for (const it of Array.from(items)) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) imgs.push(f);
      }
    }
    if (imgs.length) {
      e.preventDefault();
      await handleFiles(imgs);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
        await transcribe(blob, mr.mimeType || "audio/webm");
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível acessar o microfone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const transcribe = async (blob: Blob, mimeType: string) => {
    setTranscribing(true);
    try {
      const dataUrl = await fileToDataUrl(blob);
      const base64 = dataUrl.split(",")[1];
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: base64, mimeType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = (data?.text || "").trim();
      if (text) {
        setInput(prev => prev ? `${prev} ${text}` : text);
        inputRef.current?.focus();
      } else {
        toast.error("Não consegui entender o áudio");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao transcrever áudio");
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Abrir assistente"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[400px] max-h-[600px] flex flex-col bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center gap-2 shrink-0">
            <Bot className="h-5 w-5" />
            <span className="font-semibold text-sm">Assistente CRM</span>
            <span className="ml-auto text-xs opacity-75">CRM Harmony Digital</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{typeof m.content === "string" ? m.content : ""}</ReactMarkdown>
                    </div>
                  ) : (
                    renderUserContent(m.content)
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-xl px-3 py-2 rounded-bl-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Pending images preview */}
          {pendingImages.length > 0 && (
            <div className="border-t px-2 py-2 flex gap-2 flex-wrap shrink-0 bg-muted/30">
              {pendingImages.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="h-14 w-14 object-cover rounded-md border" />
                  <button
                    onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-xs"
                    aria-label="Remover"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t p-2 flex gap-1.5 shrink-0 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="h-9 w-9 rounded-lg shrink-0"
              aria-label="Anexar imagem"
              title="Anexar imagem"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={recording ? "destructive" : "ghost"}
              onClick={recording ? stopRecording : startRecording}
              disabled={loading || transcribing}
              className="h-9 w-9 rounded-lg shrink-0"
              aria-label={recording ? "Parar gravação" : "Gravar áudio"}
              title={recording ? "Parar gravação" : "Gravar áudio"}
            >
              {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              onPaste={onPaste}
              placeholder={recording ? "Gravando…" : "Digite, cole imagem ou grave áudio…"}
              disabled={loading || recording}
              rows={1}
              className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 resize-none max-h-24"
            />
            <Button
              size="icon"
              onClick={send}
              disabled={loading || (!input.trim() && pendingImages.length === 0)}
              className="h-9 w-9 rounded-lg shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, Upload, Trash2, FileText, Image, File, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "comprovante", label: "Comprovante" },
  { value: "exame", label: "Resultado de Exame" },
  { value: "foto", label: "Foto" },
  { value: "documento", label: "Documento" },
  { value: "outro", label: "Outro" },
];

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string | null) {
  if (!type) return <File className="h-4 w-4" />;
  if (type.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (type.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export function LeadAttachments({ leadId }: { leadId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("outro");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from("lead_attachments")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (!error && data) setAttachments(data as Attachment[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAttachments();
  }, [leadId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let uploadCount = 0;

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} excede o limite de 20MB`);
        continue;
      }

      const filePath = `${leadId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("lead-attachments")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }

      const { error: insertError } = await supabase
        .from("lead_attachments")
        .insert({
          lead_id: leadId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          category,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        toast.error(`Erro ao registrar ${file.name}`);
        continue;
      }

      uploadCount++;
    }

    if (uploadCount > 0) {
      toast.success(`${uploadCount} arquivo(s) enviado(s)!`);
      fetchAttachments();
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (att: Attachment) => {
    const { error: storageError } = await supabase.storage
      .from("lead-attachments")
      .remove([att.file_path]);

    if (storageError) {
      toast.error("Erro ao remover arquivo");
      return;
    }

    await supabase.from("lead_attachments").delete().eq("id", att.id);
    toast.success("Arquivo removido");
    fetchAttachments();
  };

  const handleDownload = async (att: Attachment) => {
    const { data, error } = await supabase.storage
      .from("lead-attachments")
      .createSignedUrl(att.file_path, 60);

    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link de download");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5" />
        Anexos
      </label>

      {/* Upload area */}
      <div className="flex gap-2 mb-3 items-end">
        <div className="flex-1">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5 text-xs"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Enviando..." : "Anexar Arquivo"}
        </Button>
      </div>

      {/* Attachments list */}
      <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && attachments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhum anexo.</p>
        )}
        {attachments.map(att => (
          <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 hover:bg-secondary/70 group text-xs">
            {getFileIcon(att.file_type)}
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-foreground">{att.file_name}</p>
              <p className="text-[10px] text-muted-foreground">
                {CATEGORIES.find(c => c.value === att.category)?.label || att.category}
                {att.file_size ? ` • ${formatFileSize(att.file_size)}` : ""}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDownload(att)}>
                <Download className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(att)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

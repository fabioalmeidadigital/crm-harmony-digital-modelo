import { useEffect, useState } from "react";
import { useWhatsAppInstance } from "@/hooks/useWhatsAppInstance";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useLabels } from "@/hooks/useLabels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Smartphone, RefreshCw, QrCode, Power, Plus, Trash2, MessageCircle, AlertCircle, CheckCircle2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function AdminWhatsApp() {
  const { loading, getStatus, getQrCode, disconnect } = useWhatsAppInstance();
  const { instances } = useWhatsAppInstances();
  const { labels, create, remove } = useLabels();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#FF6D6A");
  const [webhookUrl, setWebhookUrl] = useState("");

  // Seleciona a primeira instância ao carregar
  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances, selectedInstanceId]);

  // Atualiza URL do webhook por instância
  useEffect(() => {
    const base = (import.meta as any).env?.VITE_SUPABASE_URL || "";
    if (selectedInstanceId && base) {
      setWebhookUrl(`${base.replace(/\/$/, "")}/functions/v1/mega-webhook?instance_id=${selectedInstanceId}`);
    }
  }, [selectedInstanceId]);

  const refresh = async () => {
    if (!selectedInstanceId) return;
    try {
      const data = await getStatus(selectedInstanceId);
      setStatusData(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      toast.error("Falha ao consultar status: " + msg);
    }
  };

  useEffect(() => {
    setQr(null);
    setStatusData(null);
    refresh();
    const i = setInterval(refresh, 30000);
    return () => clearInterval(i);
  }, [selectedInstanceId]);

  const handleQr = async () => {
    if (!selectedInstanceId) return;
    try {
      const data = await getQrCode(selectedInstanceId);
      if (data?.qrcode) {
        setQr(data.qrcode.startsWith("data:") ? data.qrcode : `data:image/png;base64,${data.qrcode}`);
        toast.success("QR Code gerado — escaneie no WhatsApp");
      } else {
        toast.warning(data?.configured === false ? "Configure os secrets da Mega API primeiro." : "QR Code indisponível.");
      }
    } catch (e) {
      toast.error("Erro ao gerar QR");
    }
  };

  const handleDisconnect = async () => {
    if (!selectedInstanceId) return;
    if (!confirm("Desconectar a instância?")) return;
    await disconnect(selectedInstanceId);
    setQr(null);
    refresh();
    toast.success("Desconectado");
  };

  const [restarting, setRestarting] = useState(false);
  const handleRestartAll = async () => {
    setRestarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-restart-all", { body: {} });
      if (error) throw error;
      const okCount = (data?.results || []).filter((r: any) => r?.response?.error === false).length;
      toast.success(`Restart enviado para ${okCount}/${data?.restarted || 0} instâncias`);
      setTimeout(refresh, 2000);
    } catch (e) {
      toast.error("Erro ao reiniciar instâncias");
    } finally {
      setRestarting(false);
    }
  };

  const isConnected = (() => {
    const s = statusData?.status || "";
    return s === "connected" || s === "open" || s === "authenticated";
  })();

  const statusBadge = () => {
    if (!statusData?.configured) return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Não configurado</Badge>;
    const s = statusData.status || "unknown";
    if (isConnected) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Conectado</Badge>;
    if (s === "qr_pending" || s === "connecting") return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Aguardando QR</Badge>;
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Desconectado ({s})</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5 text-accent" /> Conexões WhatsApp (Mega API)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de instância */}
          {instances.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {instances.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => setSelectedInstanceId(inst.id)}
                  className={cn(
                    "px-3 py-2 rounded-md border text-sm font-medium transition-colors flex items-center gap-2",
                    selectedInstanceId === inst.id
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-secondary border-border text-muted-foreground hover:bg-secondary/70"
                  )}
                >
                  <Smartphone className="h-4 w-4" />
                  <span>{inst.name}</span>
                  {inst.phone_number && <span className="text-xs opacity-80">{inst.phone_number}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Indicador grande de status */}
          <div className={`p-4 rounded-lg border-2 flex items-center gap-3 ${
            isConnected
              ? "bg-green-50 border-green-200"
              : statusData?.configured
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
          }`}>
            <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {isConnected ? "WhatsApp conectado e pronto" : statusData?.configured ? "WhatsApp desconectado — escaneie o QR Code" : "Mega API não configurada"}
              </p>
              {statusData?.phone && <p className="text-xs text-muted-foreground">📱 {statusData.phone}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Status detalhado:</span>
            {statusBadge()}
          </div>

          {!statusData?.configured && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Credenciais desta instância ainda não configuradas.</p>
                <p>Adicione no backend os secrets <code className="bg-amber-100 px-1 rounded">MEGA_API_HOST{instances.find(i=>i.id===selectedInstanceId)?.secret_suffix || ""}</code>, <code className="bg-amber-100 px-1 rounded">MEGA_API_TOKEN{instances.find(i=>i.id===selectedInstanceId)?.secret_suffix || ""}</code> e <code className="bg-amber-100 px-1 rounded">MEGA_API_INSTANCE_KEY{instances.find(i=>i.id===selectedInstanceId)?.secret_suffix || ""}</code>.</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleQr} disabled={loading} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <QrCode className="h-4 w-4" /> Gerar QR Code
            </Button>
            <Button variant="outline" onClick={handleDisconnect} disabled={loading} className="gap-2">
              <Power className="h-4 w-4" /> Desconectar
            </Button>
            <Button variant="outline" onClick={handleRestartAll} disabled={restarting} className="gap-2">
              <RotateCw className={`h-4 w-4 ${restarting ? "animate-spin" : ""}`} /> Reiniciar todas
            </Button>
          </div>

          <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800 flex gap-2">
            <RotateCw className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-0.5">Restart automático ativado</p>
              <p>Todas as instâncias são reiniciadas a cada 20 minutos para evitar travamentos da sessão (recomendação do suporte Mega API).</p>
            </div>
          </div>

          {qr && (
            <div className="flex flex-col items-center p-4 border rounded-lg bg-secondary/30">
              <img src={qr} alt="QR Code" className="w-64 h-64 object-contain" />
              <p className="text-xs text-muted-foreground mt-2">Escaneie com o WhatsApp da clínica → Aparelhos conectados</p>
            </div>
          )}

          <Separator />

          <div>
            <label className="text-xs font-semibold text-muted-foreground">URL do Webhook desta instância (cole no painel da Mega API)</label>
            <div className="mt-1.5 p-2 rounded-md bg-secondary border text-xs font-mono break-all flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
              {webhookUrl}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Cada instância usa uma URL diferente — configure-a no painel da Mega API correspondente.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5 text-accent" /> Etiquetas de Conversas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da etiqueta..."
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="flex-1"
            />
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="h-10 w-14 rounded border cursor-pointer"
            />
            <Button
              onClick={async () => {
                if (!newLabel.trim()) return;
                await create(newLabel.trim(), newColor);
                setNewLabel("");
                toast.success("Etiqueta criada");
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Criar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {labels.map(l => (
              <div key={l.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border" style={{ background: `${l.color}15`, borderColor: `${l.color}40` }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                <span className="text-xs font-medium" style={{ color: l.color }}>{l.name}</span>
                <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw, Smartphone, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWhatsAppConnectionAlert } from "@/hooks/useWhatsAppConnectionAlert";
import { cn } from "@/lib/utils";

export function WhatsAppConnectionAlert() {
  const { states, disconnected, open, snooze, recheck, checking } = useWhatsAppConnectionAlert();
  const navigate = useNavigate();

  const allOk = states.length > 0 && disconnected.length === 0;

  return (
    <>
      {states.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate("/admin?tab=whatsapp")}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                allOk
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                  : "border-destructive/30 bg-destructive/10 text-destructive animate-pulse"
              )}
            >
              {allOk ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">
                {allOk ? "WhatsApp conectado" : `${disconnected.length} desconectado(s)`}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {states.map((s) => (
              <div key={s.id} className="text-xs">
                {s.name}: {s.connected ? "conectado" : s.status}
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) snooze(); }}>
        <DialogContent className="max-w-md border-destructive/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> WhatsApp desconectado
            </DialogTitle>
            <DialogDescription>
              O celular saiu do ar na conexão do WhatsApp. Enquanto isso, mensagens novas não chegam
              no CRM. Reconecte o quanto antes lendo o QR Code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {disconnected.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3"
              >
                <Smartphone className="h-4 w-4 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.phone ? `${s.phone} · ` : ""}
                    {s.configured ? `situação: ${s.status}` : "credenciais não configuradas"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={snooze}>
              Lembrar em 15 min
            </Button>
            <Button variant="outline" onClick={recheck} disabled={checking} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} /> Verificar
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => { snooze(); navigate("/admin?tab=whatsapp"); }}
            >
              Reconectar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

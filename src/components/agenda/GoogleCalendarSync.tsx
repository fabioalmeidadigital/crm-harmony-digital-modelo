import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarSync, Check, ExternalLink, RefreshCw, Settings2, Unplug } from "lucide-react";
import {
  useGoogleCalendarStatus,
  useSyncAllToGoogle,
  useSaveGoogleTokens,
  getGoogleAuthUrl,
} from "@/hooks/useGoogleCalendar";

export function GoogleCalendarSync() {
  const { data: status, isLoading } = useGoogleCalendarStatus();
  const syncAll = useSyncAllToGoogle();
  const saveTokens = useSaveGoogleTokens();

  const [setupOpen, setSetupOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [step, setStep] = useState<"credentials" | "authorize" | "code">("credentials");

  const redirectUri = window.location.origin + "/agenda";

  const handleStartAuth = () => {
    if (!clientId || !clientSecret) return;
    const url = getGoogleAuthUrl(clientId, redirectUri);
    window.open(url, "_blank", "width=600,height=700");
    setStep("code");
  };

  const handleSaveCode = () => {
    if (!authCode) return;
    saveTokens.mutate(
      { code: authCode, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri },
      { onSuccess: () => { setSetupOpen(false); resetForm(); } }
    );
  };

  const resetForm = () => {
    setClientId("");
    setClientSecret("");
    setAuthCode("");
    setStep("credentials");
  };

  const connected = status?.connected;

  return (
    <>
      <div className="flex items-center gap-2">
        {isLoading ? (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Verificando...
          </Badge>
        ) : connected ? (
          <>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              <Check className="h-3 w-3 mr-1" /> Google Agenda: {status.calendarName || "Conectado"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => syncAll.mutate()}
              disabled={syncAll.isPending}
            >
              <RefreshCw className={`h-3 w-3 ${syncAll.isPending ? "animate-spin" : ""}`} />
              Sincronizar tudo
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={() => setSetupOpen(true)}
          >
            <CalendarSync className="h-3 w-3" /> Conectar Google Agenda
          </Button>
        )}
      </div>

      <Dialog open={setupOpen} onOpenChange={(o) => { setSetupOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Conectar Google Agenda
            </DialogTitle>
            <DialogDescription>
              Conecte o Google Agenda da clínica para sincronizar agendamentos automaticamente.
            </DialogDescription>
          </DialogHeader>

          {step === "credentials" && (
            <div className="space-y-4">
              <Card className="bg-secondary/30 border-none">
                <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground text-sm">Como obter as credenciais:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Acesse o <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-accent underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Crie um projeto ou selecione um existente</li>
                    <li>Ative a <strong>Google Calendar API</strong></li>
                    <li>Crie credenciais OAuth 2.0 (tipo "App da Web")</li>
                    <li>Em "URIs de redirecionamento autorizados", adicione: <code className="bg-secondary px-1 rounded text-[11px]">{redirectUri}</code></li>
                    <li>Copie o Client ID e Client Secret</li>
                  </ol>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="GOCSPX-..." />
              </div>
              <Button onClick={handleStartAuth} disabled={!clientId || !clientSecret} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                Autorizar com Google
              </Button>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-4">
              <Card className="bg-secondary/30 border-none">
                <CardContent className="p-3 text-xs text-muted-foreground">
                  <p>Uma janela do Google foi aberta. Autorize o acesso e cole o código de autorização abaixo.</p>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <Label>Código de Autorização</Label>
                <Input value={authCode} onChange={e => setAuthCode(e.target.value)} placeholder="4/0AfJohX..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("credentials")} className="flex-1">Voltar</Button>
                <Button onClick={handleSaveCode} disabled={!authCode || saveTokens.isPending} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                  {saveTokens.isPending ? "Conectando..." : "Conectar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

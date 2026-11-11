import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Link2, Code2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CAPTURE_ENDPOINT = `${SUPABASE_URL}/functions/v1/lead-capture`;

export function AdminUTM() {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [waMessage, setWaMessage] = useState("Olá! Tenho interesse em");
  const [utmSource, setUtmSource] = useState("instagram");
  const [utmMedium, setUtmMedium] = useState("social");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");

  const applyMetaWhatsAppPreset = () => {
    setUtmSource("meta_ads");
    setUtmMedium("paid_social");
    setUtmCampaign("{{campaign.name}}");
    setUtmTerm("{{adset.name}}");
    setUtmContent("{{ad.name}}");
    toast.success("Preset Meta Ads (WhatsApp) aplicado — cole o link no campo 'URL do site' do anúncio");
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("phone_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.phone_number) setWhatsappNumber(data.phone_number.replace(/\D/g, ""));
    })();
  }, []);

  const utmString = [
    utmSource && `utm_source=${encodeURIComponent(utmSource)}`,
    utmMedium && `utm_medium=${encodeURIComponent(utmMedium)}`,
    utmCampaign && `utm_campaign=${encodeURIComponent(utmCampaign)}`,
    utmTerm && `utm_term=${encodeURIComponent(utmTerm)}`,
    utmContent && `utm_content=${encodeURIComponent(utmContent)}`,
  ].filter(Boolean).join("&");

  const fullText = utmString
    ? `${waMessage} - ${utmString}`
    : waMessage;

  const waLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(fullText)}`
    : "";

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const formExample = `<form id="lead-form">
  <input name="name" placeholder="Nome" required />
  <input name="phone" placeholder="WhatsApp" required />
  <input name="email" placeholder="E-mail" />
  <input name="procedure" placeholder="Procedimento de interesse" />
  <button type="submit">Enviar</button>
</form>

<script>
function getUTMs() {
  const p = new URLSearchParams(location.search);
  return {
    utm_source: p.get('utm_source'),
    utm_medium: p.get('utm_medium'),
    utm_campaign: p.get('utm_campaign'),
    utm_term: p.get('utm_term'),
    utm_content: p.get('utm_content'),
  };
}
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    ...Object.fromEntries(fd),
    ...getUTMs(),
    referrer: document.referrer,
    landing_page: location.href,
  };
  const r = await fetch('${CAPTURE_ENDPOINT}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (r.ok) alert('Recebido! Em breve entraremos em contato.');
  else alert('Erro ao enviar.');
});
</script>`;

  return (
    <div className="space-y-4">
      {/* Endpoint */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-accent" />
            Endpoint de captura de leads
          </CardTitle>
          <CardDescription>
            Envie POST JSON pra esse endereço. Funciona com formulários do site, landing pages, Meta Lead Ads e Google Ads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input readOnly value={CAPTURE_ENDPOINT} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => copy(CAPTURE_ENDPOINT, "Endpoint")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Campos aceitos:</strong> name, phone (obrigatório), email, procedure, source, message, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, landing_page.</p>
            <p><strong>Meta Lead Ads:</strong> use esta URL como webhook do Meta. O endpoint detecta o formato automaticamente.</p>
            <p><strong>Google Ads:</strong> em "Configuração de leads", aponte pra essa URL.</p>
          </div>
        </CardContent>
      </Card>

      {/* Form de exemplo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="h-4 w-4 text-accent" />
            Código pronto pro site da clínica
          </CardTitle>
          <CardDescription>
            Cole esse HTML em qualquer página do site. Ele captura UTMs automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea readOnly value={formExample} className="font-mono text-xs h-64" />
          <Button variant="outline" size="sm" className="mt-2" onClick={() => copy(formExample, "Código HTML")}>
            <Copy className="h-3 w-3 mr-2" /> Copiar código
          </Button>
        </CardContent>
      </Card>

      {/* Gerador wa.me */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4 text-accent" />
            Gerador de link WhatsApp rastreável
          </CardTitle>
          <CardDescription>
            Use esse link em anúncios, bio do Instagram, Google Ads etc. As UTMs viajam com a mensagem e são detectadas pelo CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 pb-2 border-b">
            <span className="text-xs text-muted-foreground self-center mr-1">Presets:</span>
            <Button type="button" variant="secondary" size="sm" onClick={applyMetaWhatsAppPreset}>
              Meta Ads · Clique p/ WhatsApp
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              setUtmSource("instagram"); setUtmMedium("bio"); setUtmCampaign("bio_link"); setUtmTerm(""); setUtmContent("");
            }}>Instagram (bio)</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              setUtmSource("google"); setUtmMedium("cpc"); setUtmCampaign(""); setUtmTerm(""); setUtmContent("");
            }}>Google Ads</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Número do WhatsApp (DDI+DDD)</Label>
              <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="5511999999999" />
            </div>
            <div>
              <Label className="text-xs">Mensagem inicial</Label>
              <Input value={waMessage} onChange={e => setWaMessage(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">utm_source <span className="text-muted-foreground">(ex: instagram, google)</span></Label>
              <Input value={utmSource} onChange={e => setUtmSource(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">utm_medium <span className="text-muted-foreground">(ex: social, cpc, organic)</span></Label>
              <Input value={utmMedium} onChange={e => setUtmMedium(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">utm_campaign <span className="text-muted-foreground">(ex: botox_setembro)</span></Label>
              <Input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">utm_term <span className="text-muted-foreground">(palavra-chave)</span></Label>
              <Input value={utmTerm} onChange={e => setUtmTerm(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">utm_content <span className="text-muted-foreground">(variação do anúncio)</span></Label>
              <Input value={utmContent} onChange={e => setUtmContent(e.target.value)} />
            </div>
          </div>

          <div className="pt-2 border-t">
            <Label className="text-xs">Link gerado</Label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={waLink} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(waLink, "Link")} disabled={!waLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" className="text-xs text-accent underline mt-1 inline-block">
                Testar link →
              </a>
            )}
            <div className="mt-3 p-3 rounded-md bg-muted/50 text-xs space-y-2">
              <p className="font-semibold">📘 Como usar em campanha Meta Ads "Clique para WhatsApp":</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Aplique o preset <strong>Meta Ads · Clique p/ WhatsApp</strong> acima.</li>
                <li>Ajuste a <strong>Mensagem inicial</strong> (ex: "Olá! Vim do anúncio de Botox").</li>
                <li>No Gerenciador de Anúncios, escolha objetivo <strong>Engajamento → Mensagens no WhatsApp</strong>.</li>
                <li>Na etapa do anúncio, em <strong>Modelo de mensagem</strong>, cole o texto abaixo (Meta preenche os <code>{`{{...}}`}</code> com o nome real da campanha/conjunto/anúncio).</li>
                <li>Quando o lead clicar e mandar a mensagem, o CRM já cadastra com origem <strong>Meta Ads</strong> e todas as UTMs preenchidas.</li>
              </ol>
              <div className="pt-1">
                <Label className="text-xs">Texto da mensagem pronta (para colar no Meta)</Label>
                <div className="flex gap-2 mt-1">
                  <Input readOnly value={fullText} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copy(fullText, "Mensagem")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground pt-1">
                💡 O webhook do WhatsApp detecta automaticamente <code>utm_source=</code>, <code>utm_campaign=</code> etc. dentro do texto da primeira mensagem — não some com o rastreamento no cadastro do lead.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

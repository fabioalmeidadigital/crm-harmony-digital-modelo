# CRM Harmony Digital Modelo

Modelo de CRM da **Harmony Digital** para clínicas: gestão de leads com origem rastreada (UTM, Meta Ads, indicação), atendimento 100% integrado ao WhatsApp, funis de avaliação e de procedimento, agenda e assistente de IA.

Serve como ponto de partida para novos projetos: copie (botão **Use this template** ou `git clone`), conecte ao seu próprio Supabase e adapte marca, etapas e listas ao cliente.

> Este repositório não contém dados reais de clientes ou pacientes. Os registros de exemplo (ex.: fornecedores na tela de Admin) são fictícios.

## O que vem pronto

| Área | O que faz |
|---|---|
| **Dashboard** | KPIs do período (leads, consultas agendadas/realizadas), filtros de data, gráficos por origem e etapa |
| **Leads** | Cadastro, busca, importação, anexos, notas, dados de pagamento e de formulário Meta Ads |
| **Pipeline** | Dois funis em kanban: *Leads* (novo → contato → consulta agendada → consulta realizada) e *Vendas* (plano → decisão → procedimento fechado → agendado → realizado → pós) |
| **Atendimento** | Visão em planilha do atendimento, com status que movem o lead no funil |
| **Inbox (WhatsApp)** | Conversas em tempo real via Mega API (várias instâncias), envio de texto/mídia/áudio, criação automática de leads |
| **Agenda** | Consultas e procedimentos, disponibilidade do profissional, sincronização com Google Agenda |
| **Relatórios** | Conversão, tempo de resposta em horário comercial, origens |
| **Admin** | Usuários e papéis (`mestre`, `administrativo`, `comercial`), procedimentos, origens, listas do atendimento, captura de leads/UTM, WhatsApp, agentes de IA, fornecedores |
| **Assistente de IA** | Chat que consulta e altera o CRM por linguagem natural (busca leads, agenda, cria notas, responde no WhatsApp), com transcrição de áudio |

## Stack

- React 18 + Vite + TypeScript, Tailwind CSS e shadcn/ui
- Supabase (Postgres, Auth, Storage, Realtime e Edge Functions em Deno)
- WhatsApp pela Mega API (ou via n8n)
- IA por qualquer gateway compatível com a API da OpenAI (padrão: Google Gemini)

## Como usar em um novo projeto

### 1. Código

```sh
git clone https://github.com/<conta>/<novo-repo>.git
cd <novo-repo>
npm install
cp .env.example .env.local   # preencha com os dados do seu Supabase
npm run dev                  # http://localhost:8080
```

### 2. Supabase

Crie um projeto novo no Supabase e, com a [Supabase CLI](https://supabase.com/docs/guides/cli):

```sh
# troque SEU_PROJECT_REF em supabase/config.toml pelo ref do seu projeto
supabase link --project-ref SEU_PROJECT_REF
supabase db push                    # aplica as migrations de supabase/migrations
supabase functions deploy           # publica as Edge Functions
```

O **primeiro usuário** que se cadastrar vira `mestre` (administrador); os seguintes entram como `comercial`.

Em *Authentication → URL Configuration*, aponte o Site URL e os Redirect URLs para o endereço onde o app vai rodar.

### 3. Secrets das Edge Functions

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já são fornecidos pelo Supabase. Configure os demais conforme o que for usar:

```sh
# IA (assistente e transcrição de áudio)
supabase secrets set AI_API_KEY=...
# opcionais — padrão: endpoint do Gemini compatível com OpenAI e modelo gemini-2.5-flash
supabase secrets set AI_GATEWAY_URL=https://api.openai.com/v1/chat/completions AI_MODEL=gpt-4o-mini

# WhatsApp (Mega API) — instância principal
supabase secrets set MEGA_API_HOST=... MEGA_API_INSTANCE_KEY=... MEGA_API_TOKEN=...
# segunda instância: mesmas variáveis com sufixo _2 (MEGA_API_HOST_2 etc.)
```

O Google Agenda é configurado pela própria tela de Agenda (Client ID/Secret do OAuth do Google Cloud).

Para manter as instâncias de WhatsApp ativas, agende a função `whatsapp-restart-all` (ex.: a cada 20 min) com `pg_cron` + `pg_net` ou um cron externo.

### 4. Deploy do frontend

Qualquer host de site estático serve (Vercel, Netlify etc.): build com `npm run build`, pasta `dist/`, e as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente.

## Personalizar para o cliente

- **Nome e marca:** `index.html` (título e descrição), logos em `src/assets/` e `public/favicon.svg`.
- **Cores e fonte:** variáveis CSS em `src/index.css` (`--primary`, `--accent`, `--sidebar-*` etc.) e `tailwind.config.ts`.
- **Etapas dos funis e motivos de perda:** `src/lib/constants.ts` (as etapas também existem no enum `pipeline_stage` do banco).
- **Listas do atendimento** (origens, convênios, motivos de contato): tela Admin → listas; as constantes em `src/lib/attendance.ts` são só o padrão inicial.
- **Procedimentos e origens iniciais:** cadastrados no Admin (o seed inicial está nas migrations).
- **Tom e regras do assistente de IA:** prompt em `supabase/functions/crm-assistant/index.ts`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest) |

---

Harmony Digital

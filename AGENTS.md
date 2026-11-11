# CRM Harmony Digital Modelo — notas para agentes de IA

- Atendimento (planilha) fica em colunas de `leads` (attendance_status etc.); o mapeamento attendance_status → stage está em `src/lib/attendance.ts` — fonte única de verdade do lead.
- `LeadsContext` busca leads em páginas de 1000 linhas — a tabela passa do limite padrão da API.
- As listas suspensas do Atendimento vêm de `sheet_options` (category/value), editadas no Admin; as constantes de `src/lib/attendance.ts` são só fallback.
- Este repositório é um **modelo**: nada de dados reais de clientes ou pacientes no código, nas migrations ou no histórico. Chaves e segredos ficam em `.env.local` (frontend) e em secrets do Supabase (Edge Functions).

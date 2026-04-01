# Arquitetura do FleetControl

## Visão geral

O FleetControl é uma aplicação **full-stack em monorepo** construída com Next.js. O frontend e o backend residem no mesmo repositório e são deployados juntos no Vercel.

---

## Diagrama

```
┌─────────────────────────────────────────────────────┐
│                    USUÁRIO (browser / PWA)           │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────┐
│                  VERCEL (Next.js 15)                 │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  FRONTEND — src/app/(app)/                   │   │
│  │  React + Tailwind + React Hook Form + Zod    │   │
│  │                                              │   │
│  │  /dashboard     → visão geral da frota       │   │
│  │  /checkout      → retirada de veículo        │   │
│  │  /checkin       → devolução de veículo       │   │
│  │  /schedule      → novo agendamento           │   │
│  │  /schedules     → lista de agendamentos      │   │
│  │  /history       → histórico + CSV            │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  BACKEND — src/app/api/                      │   │
│  │  Next.js API Routes (Node.js serverless)     │   │
│  │                                              │   │
│  │  POST /api/admin        → login admin        │   │
│  │  POST /api/admin/users  → criar colaborador  │   │
│  │  DELETE /api/admin/users → remover colabor.  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  MIDDLEWARE — src/proxy.ts                   │   │
│  │  Protege rotas /dashboard, /checkout, etc.   │   │
│  │  Verifica sessão de colaborador e admin      │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────┘
                         │ supabase-js (REST/Realtime)
┌────────────────────────▼────────────────────────────┐
│                  SUPABASE (cloud)                    │
│                                                      │
│  PostgreSQL                                          │
│  ├── branches        → filiais                       │
│  ├── collaborators   → colaboradores                 │
│  ├── vehicles        → veículos                      │
│  ├── trips           → viagens (checkout/checkin)    │
│  └── schedules       → agendamentos                  │
│                                                      │
│  Storage                                             │
│  └── fleet-photos    → fotos de checkout/checkin     │
└─────────────────────────────────────────────────────┘
```

---

## Estrutura de pastas

```
fleet-app/
├── src/
│   ├── app/
│   │   ├── (app)/              # Rotas protegidas (autenticadas)
│   │   │   ├── dashboard/      # Visão geral da frota
│   │   │   ├── checkout/       # Retirada de veículo
│   │   │   ├── checkin/        # Devolução de veículo
│   │   │   ├── schedule/       # Novo agendamento
│   │   │   ├── schedules/      # Lista de agendamentos
│   │   │   ├── history/        # Histórico + CSV
│   │   │   └── layout.tsx      # Header + nav bar
│   │   ├── api/
│   │   │   └── admin/          # Endpoints de admin
│   │   ├── login/              # Página de login
│   │   ├── layout.tsx          # Root layout (ThemeProvider, AuthProvider)
│   │   └── globals.css         # Estilos globais + Tailwind
│   ├── components/             # Componentes reutilizáveis
│   │   ├── PhotoCapture.tsx    # Captura de fotos (câmera/upload)
│   │   └── ThemeToggle.tsx     # Botão sol/lua para dark mode
│   ├── context/
│   │   ├── AuthContext.tsx     # Sessão do colaborador logado
│   │   └── ThemeContext.tsx    # Tema claro/escuro
│   ├── lib/
│   │   └── supabase.ts         # Client do Supabase (browser)
│   ├── proxy.ts                # Middleware de autenticação
│   └── types/
│       └── index.ts            # Tipos TypeScript (Vehicle, Trip, etc.)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── public/                     # Assets estáticos + PWA
│   ├── manifest.json
│   ├── sw.js                   # Service worker
│   └── icons/
├── docs/                       # Documentação do projeto
└── vercel.json                 # Configuração de deploy
```

---

## Banco de dados

### Principais tabelas

| Tabela | Descrição |
|--------|-----------|
| `branches` | Filiais da empresa |
| `collaborators` | Colaboradores que usam o sistema |
| `vehicles` | Frota de veículos (status: available / in_use / maintenance) |
| `trips` | Registro de cada retirada/devolução (status: open / closed) |
| `schedules` | Agendamentos futuros (status: pending / confirmed / cancelled / completed) |

### Invariante importante

Quando existe uma `trip` com `status = 'open'`, o `vehicle.status` correspondente **deve** ser `in_use`. Se houver inconsistência (trip aberta + veículo disponível), rodar:

```sql
UPDATE trips t
SET status = 'closed', arrived_at = now()
FROM vehicles v
WHERE t.vehicle_id = v.id
  AND t.status = 'open'
  AND v.status = 'available';
```

---

## Autenticação

O sistema tem **dois tipos de sessão**:

| Tipo | Mecanismo | Onde é usado |
|------|-----------|-------------|
| Colaborador | Cookie `collaborator_id` (UUID do Supabase Auth) | Todas as rotas do app |
| Admin | Cookie `admin_session` (hash da senha) | Painel admin (`/admin`) |

O middleware (`proxy.ts`) verifica ambos os cookies em cada requisição e redireciona para `/login` se não autenticado.

---

## Variáveis de ambiente

| Variável | Onde é usada | Ambiente |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Front + middleware | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Front + middleware | Production + Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | API Routes (admin) | Production + Preview |
| `ADMIN_PASSWORD` | API Route + middleware | Production + Preview |

> As variáveis `NEXT_PUBLIC_*` são embutidas em **build time** pelo Next.js — devem estar configuradas no Vercel **antes** do deploy.

# Arquitetura do SGMU

## VisÃ£o geral

O SGMU Ã© uma aplicaÃ§Ã£o **full-stack em monorepo** construÃ­da com Next.js. O frontend e o backend residem no mesmo repositÃ³rio e sÃ£o deployados juntos no Vercel.

---

## Diagrama

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    USUÃRIO (browser / PWA)           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â”‚ HTTPS
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  VERCEL (Next.js 15)                 â”‚
â”‚                                                      â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  FRONTEND â€” src/app/(app)/                   â”‚   â”‚
â”‚  â”‚  React + Tailwind + React Hook Form + Zod    â”‚   â”‚
â”‚  â”‚                                              â”‚   â”‚
â”‚  â”‚  /dashboard     â†’ visÃ£o geral da frota       â”‚   â”‚
â”‚  â”‚  /checkout      â†’ retirada de veÃ­culo        â”‚   â”‚
â”‚  â”‚  /checkin       â†’ devoluÃ§Ã£o de veÃ­culo       â”‚   â”‚
â”‚  â”‚  /schedule      â†’ novo agendamento           â”‚   â”‚
â”‚  â”‚  /schedules     â†’ lista de agendamentos      â”‚   â”‚
â”‚  â”‚  /history       â†’ histÃ³rico + CSV            â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                                                      â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  BACKEND â€” src/app/api/                      â”‚   â”‚
â”‚  â”‚  Next.js API Routes (Node.js serverless)     â”‚   â”‚
â”‚  â”‚                                              â”‚   â”‚
â”‚  â”‚  POST /api/admin        â†’ login admin        â”‚   â”‚
â”‚  â”‚  POST /api/admin/users  â†’ criar colaborador  â”‚   â”‚
â”‚  â”‚  DELETE /api/admin/users â†’ remover colabor.  â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                                                      â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  MIDDLEWARE â€” src/proxy.ts                   â”‚   â”‚
â”‚  â”‚  Protege rotas /dashboard, /checkout, etc.   â”‚   â”‚
â”‚  â”‚  Verifica sessÃ£o de colaborador e admin      â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â”‚ supabase-js (REST/Realtime)
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  SUPABASE (cloud)                    â”‚
â”‚                                                      â”‚
â”‚  PostgreSQL                                          â”‚
â”‚  â”œâ”€â”€ branches        â†’ filiais                       â”‚
â”‚  â”œâ”€â”€ collaborators   â†’ colaboradores                 â”‚
â”‚  â”œâ”€â”€ vehicles        â†’ veÃ­culos                      â”‚
â”‚  â”œâ”€â”€ trips           â†’ viagens (checkout/checkin)    â”‚
â”‚  â””â”€â”€ schedules       â†’ agendamentos                  â”‚
â”‚                                                      â”‚
â”‚  Storage                                             â”‚
â”‚  â””â”€â”€ fleet-photos    â†’ fotos de checkout/checkin     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Estrutura de pastas

```
fleet-app/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ (app)/              # Rotas protegidas (autenticadas)
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/      # VisÃ£o geral da frota
â”‚   â”‚   â”‚   â”œâ”€â”€ checkout/       # Retirada de veÃ­culo
â”‚   â”‚   â”‚   â”œâ”€â”€ checkin/        # DevoluÃ§Ã£o de veÃ­culo
â”‚   â”‚   â”‚   â”œâ”€â”€ schedule/       # Novo agendamento
â”‚   â”‚   â”‚   â”œâ”€â”€ schedules/      # Lista de agendamentos
â”‚   â”‚   â”‚   â”œâ”€â”€ history/        # HistÃ³rico + CSV
â”‚   â”‚   â”‚   â””â”€â”€ layout.tsx      # Header + nav bar
â”‚   â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”‚   â””â”€â”€ admin/          # Endpoints de admin
â”‚   â”‚   â”œâ”€â”€ login/              # PÃ¡gina de login
â”‚   â”‚   â”œâ”€â”€ layout.tsx          # Root layout (ThemeProvider, AuthProvider)
â”‚   â”‚   â””â”€â”€ globals.css         # Estilos globais + Tailwind
â”‚   â”œâ”€â”€ components/             # Componentes reutilizÃ¡veis
â”‚   â”‚   â”œâ”€â”€ PhotoCapture.tsx    # Captura de fotos (cÃ¢mera/upload)
â”‚   â”‚   â””â”€â”€ ThemeToggle.tsx     # BotÃ£o sol/lua para dark mode
â”‚   â”œâ”€â”€ context/
â”‚   â”‚   â”œâ”€â”€ AuthContext.tsx     # SessÃ£o do colaborador logado
â”‚   â”‚   â””â”€â”€ ThemeContext.tsx    # Tema claro/escuro
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â””â”€â”€ supabase.ts         # Client do Supabase (browser)
â”‚   â”œâ”€â”€ proxy.ts                # Middleware de autenticaÃ§Ã£o
â”‚   â””â”€â”€ types/
â”‚       â””â”€â”€ index.ts            # Tipos TypeScript (Vehicle, Trip, etc.)
â”œâ”€â”€ supabase/
â”‚   â””â”€â”€ migrations/
â”‚       â””â”€â”€ 001_initial_schema.sql
â”œâ”€â”€ public/                     # Assets estÃ¡ticos + PWA
â”‚   â”œâ”€â”€ manifest.json
â”‚   â”œâ”€â”€ sw.js                   # Service worker
â”‚   â””â”€â”€ icons/
â”œâ”€â”€ docs/                       # DocumentaÃ§Ã£o do projeto
â””â”€â”€ vercel.json                 # ConfiguraÃ§Ã£o de deploy
```

---

## Banco de dados

### Principais tabelas

| Tabela | DescriÃ§Ã£o |
|--------|-----------|
| `branches` | Filiais da empresa |
| `collaborators` | Colaboradores que usam o sistema |
| `vehicles` | Frota de veÃ­culos (status: available / in_use / maintenance) |
| `trips` | Registro de cada retirada/devoluÃ§Ã£o (status: open / closed) |
| `schedules` | Agendamentos futuros (status: pending / confirmed / cancelled / completed) |

### Invariante importante

Quando existe uma `trip` com `status = 'open'`, o `vehicle.status` correspondente **deve** ser `in_use`. Se houver inconsistÃªncia (trip aberta + veÃ­culo disponÃ­vel), rodar:

```sql
UPDATE trips t
SET status = 'closed', arrived_at = now()
FROM vehicles v
WHERE t.vehicle_id = v.id
  AND t.status = 'open'
  AND v.status = 'available';
```

---

## AutenticaÃ§Ã£o

O sistema tem **dois tipos de sessÃ£o**:

| Tipo | Mecanismo | Onde Ã© usado |
|------|-----------|-------------|
| Colaborador | Cookie `collaborator_id` (UUID do Supabase Auth) | Todas as rotas do app |
| Admin | Cookie `admin_session` (hash da senha) | Painel admin (`/admin`) |

O middleware (`proxy.ts`) verifica ambos os cookies em cada requisiÃ§Ã£o e redireciona para `/login` se nÃ£o autenticado.

---

## VariÃ¡veis de ambiente

| VariÃ¡vel | Onde Ã© usada | Ambiente |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Front + middleware | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Front + middleware | Production + Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | API Routes (admin) | Production + Preview |
| `ADMIN_PASSWORD` | API Route + middleware | Production + Preview |

> As variÃ¡veis `NEXT_PUBLIC_*` sÃ£o embutidas em **build time** pelo Next.js â€” devem estar configuradas no Vercel **antes** do deploy.

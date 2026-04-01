# FleetControl

Sistema de gestão de frota para controle de retiradas, devoluções e agendamentos de veículos.

- **Produção:** https://fleetapp-xi.vercel.app
- **Repositório:** https://github.com/JoaoGabriel0320/fleet-app

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS v4 |
| Banco de dados | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Formulários | React Hook Form + Zod |
| Deploy | Vercel |

---

## Funcionalidades implementadas

- **Retirada de veículo** — checkout em 4 etapas com fotos e KM de saída
- **Devolução** — checkin com fotos e KM de chegada
- **Agendamento** — reserva de veículo por data/hora
- **Dashboard** — visão geral da frota em tempo real (Supabase Realtime)
- **Histórico** — relatório de viagens com exportação CSV (padrão Excel BR `;`)
- **Dark mode** — tema claro/escuro com persistência no localStorage
- **PWA** — instalável no celular como app nativo

---

## Arquitetura

Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para detalhes completos.

```
Usuário (browser)
      ↓
  Next.js — Vercel
  ├── Pages (src/app)       → UI em React
  ├── API Routes (src/app/api) → lógica de admin
  └── supabase-js            → acesso direto ao banco
              ↓
         Supabase (cloud)
         ├── PostgreSQL       → dados
         └── Storage          → fotos dos veículos
```

---

## CI/CD

Veja [docs/CICD.md](docs/CICD.md) para o fluxo completo.

```
feat/* → PR → develop (staging) → PR → master (produção)
```

---

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env.local
# Preencher NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD

# Rodar em desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Épico FLEET — Roadmap

| Story | Descrição | Status |
|-------|-----------|--------|
| FLEET-001 | Retirada e devolução de veículos | ✅ Produção |
| FLEET-002 | Agendamento por data/hora | ✅ Produção |
| FLEET-003 | Cadastro de veículos (admin) | 🔜 Próximo |
| FLEET-004 | Cadastro de colaboradores e filiais | 🔜 Próximo |
| FLEET-005 | Dashboard em tempo real | ✅ Produção |
| FLEET-006 | Histórico e relatórios | ✅ Produção |
| FLEET-007 | Alertas de atraso | 🔜 Próximo |
| FLEET-008 | Manutenção por KM | 🔜 Próximo |

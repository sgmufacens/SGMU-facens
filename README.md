# SGMU

Sistema de gestão de frota para controle de retiradas, devoluções e agendamentos de veículos.

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

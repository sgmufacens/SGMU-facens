# CI/CD — FleetControl

## Fluxo de branches

```
feat/nome-da-feature
        │
        │  PR (code review / QA)
        ▼
     develop  ──────────────►  Vercel Preview (staging)
        │
        │  PR (aprovação para produção)
        ▼
      master  ──────────────►  Vercel Production
```

### Regras

| Branch | Proteção | Deploy Vercel |
|--------|----------|--------------|
| `master` | Requer PR (merge direto bloqueado) | Produção — https://fleetapp-xi.vercel.app |
| `develop` | Livre | Preview automático |
| `feat/*` | Livre | Preview automático (por PR) |

---

## Passo a passo para uma nova feature

### 1. Criar branch a partir de develop

```bash
git checkout develop
git pull origin develop
git checkout -b feat/nome-da-feature
```

### 2. Desenvolver e commitar

```bash
git add src/...
git commit -m "feat: descrição da mudança"
```

### 3. Abrir PR para develop (staging)

```bash
git push origin feat/nome-da-feature
gh pr create --base develop --head feat/nome-da-feature --title "feat: descrição"
```

O Vercel gera automaticamente uma **URL de preview** para testar.

### 4. QA no ambiente de staging

- Acessar a URL de preview gerada pelo Vercel
- Validar a feature no ambiente real (com banco de dados de staging)
- Se aprovado, mergear o PR

```bash
gh pr merge <número> --squash
```

### 5. Abrir PR de develop → master (produção)

```bash
gh pr create --base master --head develop --title "release: descrição do release"
```

### 6. Merge para produção

```bash
gh pr merge <número> --squash --admin
```

O Vercel detecta o push no `master` e faz o deploy automático em produção.

---

## Ambientes Vercel

| Ambiente | Branch | URL |
|----------|--------|-----|
| Production | `master` | https://fleetapp-xi.vercel.app |
| Preview | `develop` / `feat/*` / PRs | URL gerada automaticamente pelo Vercel |

### Variáveis de ambiente no Vercel

As variáveis precisam estar configuradas para **cada ambiente** (Production e Preview).
Para adicionar sem corrupção de newlines, usar a REST API do Vercel:

```bash
# Token em: %APPDATA%\com.vercel.cli\Data\auth.json
# Project ID: prj_ATsXvj90CzsIS9eL4IwZCbTr4jn9

curl -X POST https://api.vercel.com/v10/projects/prj_ATsXvj90CzsIS9eL4IwZCbTr4jn9/env \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "NOME_DA_VAR",
    "value": "valor",
    "type": "encrypted",
    "target": ["preview"]
  }'
```

> **Atenção:** Não usar `vercel env add` via PowerShell — causa corrupção com `\r\n` nos valores.

---

## Histórico de releases

| Data | Release | Descrição |
|------|---------|-----------|
| 2026-03-03 | v1.0 | Deploy inicial — checkout, checkin, histórico, dashboard |
| 2026-03-03 | v1.1 | Dark mode + anti-FOUC + PWA instalável |
| 2026-03-03 | v1.2 | Fix: sincronização de status viagem/veículo |
| 2026-03-03 | PR #13 | Fix: build falhando por middleware.ts conflitante + TypeScript types |

### PR #13 — fix: build falhando por middleware.ts conflitante + TypeScript types (2026-03-03)
**Problema raiz**: Todos os deploys estavam falhando (erro de build) desde o PR #9.
Next.js 16 não aceita `middleware.ts` e `proxy.ts` simultaneamente — `proxy.ts` já é
o middleware nativo.
- Remove `src/middleware.ts` (conflito com `proxy.ts` no Next.js 16)
- Corrige tipos TypeScript implícitos em `dashboard/page.tsx`
- Primeiro deploy bem-sucedido desde PR #8

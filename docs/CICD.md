# CI/CD â€” SGMU

## Fluxo de branches

```
feat/nome-da-feature
        â”‚
        â”‚  PR (code review / QA)
        â–¼
     develop  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  Vercel Preview (staging)
        â”‚
        â”‚  PR (aprovaÃ§Ã£o para produÃ§Ã£o)
        â–¼
      master  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  Vercel Production
```

### Regras

| Branch | ProteÃ§Ã£o | Deploy Vercel |
|--------|----------|--------------|
| `master` | Requer PR (merge direto bloqueado) | ProduÃ§Ã£o â€” https://fleetapp-xi.vercel.app |
| `develop` | Livre | Preview automÃ¡tico |
| `feat/*` | Livre | Preview automÃ¡tico (por PR) |

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
git commit -m "feat: descriÃ§Ã£o da mudanÃ§a"
```

### 3. Abrir PR para develop (staging)

```bash
git push origin feat/nome-da-feature
gh pr create --base develop --head feat/nome-da-feature --title "feat: descriÃ§Ã£o"
```

O Vercel gera automaticamente uma **URL de preview** para testar.

### 4. QA no ambiente de staging

- Acessar a URL de preview gerada pelo Vercel
- Validar a feature no ambiente real (com banco de dados de staging)
- Se aprovado, mergear o PR

```bash
gh pr merge <nÃºmero> --squash
```

### 5. Abrir PR de develop â†’ master (produÃ§Ã£o)

```bash
gh pr create --base master --head develop --title "release: descriÃ§Ã£o do release"
```

### 6. Merge para produÃ§Ã£o

```bash
gh pr merge <nÃºmero> --squash --admin
```

O Vercel detecta o push no `master` e faz o deploy automÃ¡tico em produÃ§Ã£o.

---

## Ambientes Vercel

| Ambiente | Branch | URL |
|----------|--------|-----|
| Production | `master` | https://fleetapp-xi.vercel.app |
| Preview | `develop` / `feat/*` / PRs | URL gerada automaticamente pelo Vercel |

### VariÃ¡veis de ambiente no Vercel

As variÃ¡veis precisam estar configuradas para **cada ambiente** (Production e Preview).
Para adicionar sem corrupÃ§Ã£o de newlines, usar a REST API do Vercel:

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

> **AtenÃ§Ã£o:** NÃ£o usar `vercel env add` via PowerShell â€” causa corrupÃ§Ã£o com `\r\n` nos valores.

---

## HistÃ³rico de releases

| Data | Release | DescriÃ§Ã£o |
|------|---------|-----------|
| 2026-03-03 | v1.0 | Deploy inicial â€” checkout, checkin, histÃ³rico, dashboard |
| 2026-03-03 | v1.1 | Dark mode + anti-FOUC + PWA instalÃ¡vel |
| 2026-03-03 | v1.2 | Fix: sincronizaÃ§Ã£o de status viagem/veÃ­culo |
| 2026-03-03 | PR #13 | Fix: build falhando por middleware.ts conflitante + TypeScript types |

### PR #13 â€” fix: build falhando por middleware.ts conflitante + TypeScript types (2026-03-03)
**Problema raiz**: Todos os deploys estavam falhando (erro de build) desde o PR #9.
Next.js 16 nÃ£o aceita `middleware.ts` e `proxy.ts` simultaneamente â€” `proxy.ts` jÃ¡ Ã©
o middleware nativo.
- Remove `src/middleware.ts` (conflito com `proxy.ts` no Next.js 16)
- Corrige tipos TypeScript implÃ­citos em `dashboard/page.tsx`
- Primeiro deploy bem-sucedido desde PR #8

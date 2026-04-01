# Guia de Migração — FleetControl

Este documento descreve os passos para migrar o FleetControl do ambiente atual
(Supabase Storage + Vercel) para infraestrutura própria da empresa, cobrindo:

1. **Troca de domínio** (domínio próprio, independente de onde o app estiver hospedado)
2. **Storage de imagens: Supabase → AWS S3**

> As seções estão ordenadas do menor para o maior impacto. Recomenda-se seguir essa ordem.

---

## Parte 1 — Troca de Domínio

### Pré-requisitos
- Acesso ao painel de DNS do domínio (ex: Route 53, Registro.br, Cloudflare)
- Acesso ao painel do Vercel (enquanto o host ainda for Vercel)

### Passo a passo

#### 1.1 Adicionar o domínio no Vercel

No painel Vercel → Settings → Domains → Add Domain:

```
fleet.suaempresa.com.br
```

O Vercel vai exibir um registro DNS para apontar. Exemplo:

```
Tipo: CNAME
Nome: fleet
Valor: cname.vercel-dns.com
```

#### 1.2 Configurar o DNS

No provedor de DNS da empresa, criar o registro apontado pelo Vercel:

```
fleet.suaempresa.com.br  CNAME  cname.vercel-dns.com  TTL: 300
```

> Se for domínio raiz (sem subdomínio), usar registro `A` com o IP fornecido pelo Vercel.

#### 1.3 Aguardar propagação

Normalmente leva de 5 minutos a 2 horas. Verificar com:

```bash
nslookup fleet.suaempresa.com.br
# ou
dig fleet.suaempresa.com.br
```

#### 1.4 Verificar HTTPS automático

O Vercel emite certificado SSL automaticamente via Let's Encrypt.
Após a propagação, `https://fleet.suaempresa.com.br` já estará funcionando.

#### 1.5 (Opcional) Redirecionar URL antiga

No Vercel → Settings → Domains, marcar o domínio antigo (`fleetapp-xi.vercel.app`)
como redirecionamento para o novo domínio.

---

## Parte 2 — Migração de Storage: Supabase → AWS S3

### Visão geral do que muda

| Hoje | Após migração |
|------|--------------|
| Supabase Storage (`fleet-photos`) | AWS S3 bucket |
| URL pública do Supabase | URL do S3 ou CloudFront |
| Upload via `supabase.storage` | Upload via `@aws-sdk/client-s3` |

### Arquivos que precisam ser alterados

```
src/app/(app)/checkout/page.tsx     — upload de fotos de saída
src/app/(app)/checkin/page.tsx      — upload de fotos de chegada
src/components/PhotoCapture.tsx     — (se o upload for centralizado aqui futuramente)
```

---

### Passo a passo

#### 2.1 Criar o bucket S3 na AWS

No console AWS → S3 → Create Bucket:

```
Nome:   fleet-photos-suaempresa
Região: sa-east-1 (São Paulo)
```

**Configurações recomendadas:**
- Block all public access: **DESATIVADO** (as fotos precisam ser acessíveis para exibição)
  - Ou manter bloqueado e usar CloudFront com OAC (mais seguro — ver seção 2.5)

#### 2.2 Criar usuário IAM para o app

No console AWS → IAM → Users → Create User:

```
Nome: fleetcontrol-app
```

Política a anexar (criar como inline policy):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::fleet-photos-suaempresa/*"
    }
  ]
}
```

Gerar **Access Key ID** e **Secret Access Key** — guardar com segurança.

#### 2.3 Adicionar variáveis de ambiente

No Vercel (ou no provedor de hospedagem escolhido), adicionar:

```env
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=fleet-photos-suaempresa
# Se usar CloudFront:
AWS_CLOUDFRONT_URL=https://xxxxxxxx.cloudfront.net
```

#### 2.4 Instalar o SDK da AWS

```bash
npm install @aws-sdk/client-s3
```

#### 2.5 Criar a API Route de upload

Criar `src/app/api/upload/route.ts` — o upload passa pelo servidor para não expor as credenciais AWS no browser:

```ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const folder = (formData.get('folder') as string) ?? 'uploads'

  if (!file) {
    return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const key = `${folder}/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }))

  const baseUrl = process.env.AWS_CLOUDFRONT_URL
    ?? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`

  return NextResponse.json({ url: `${baseUrl}/${key}` })
}
```

#### 2.6 Atualizar o checkout para usar a nova API de upload

Em `src/app/(app)/checkout/page.tsx`, substituir o bloco de upload do Supabase:

```ts
// ANTES — Supabase Storage
async function uploadPhotos(files: File[], folder: string): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const path = `${folder}/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage
      .from('fleet-photos')
      .upload(path, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from('fleet-photos')
      .getPublicUrl(data.path)
    urls.push(publicUrl)
  }
  return urls
}

// DEPOIS — AWS S3 via API Route
async function uploadPhotos(files: File[], folder: string): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Erro no upload')
    const { url } = await res.json()
    urls.push(url)
  }
  return urls
}
```

Aplicar a mesma mudança em `src/app/(app)/checkin/page.tsx`.

#### 2.7 Migrar fotos existentes do Supabase para o S3

As fotos já registradas no banco têm URLs do Supabase. Para migrá-las:

```bash
# 1. Listar todos os objetos no bucket do Supabase
# (via painel Supabase → Storage → fleet-photos)

# 2. Baixar cada arquivo e re-enviar para o S3
# Script de migração (Node.js):
```

```js
// scripts/migrate-photos.mjs
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const s3 = new S3Client({ region: process.env.AWS_REGION, credentials: { ... } })

// 1. Buscar todas as trips com fotos
const { data: trips } = await supabase.from('trips').select('id, photos_departure, photos_arrival')

for (const trip of trips) {
  for (const photoUrl of [...trip.photos_departure, ...trip.photos_arrival]) {
    // 2. Baixar do Supabase
    const res = await fetch(photoUrl)
    const buffer = Buffer.from(await res.arrayBuffer())

    // 3. Extrair o path (ex: checkout/uuid.jpg)
    const key = new URL(photoUrl).pathname.split('/object/public/fleet-photos/')[1]

    // 4. Enviar para o S3
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    }))

    // 5. Atualizar URL no banco para a URL do S3
    const newUrl = `${process.env.AWS_CLOUDFRONT_URL}/${key}`
    // ... update no banco via supabase admin
  }
}
```

> **Nota:** Este script deve ser executado uma única vez antes de remover o bucket do Supabase.
> Manter o bucket do Supabase ativo por pelo menos 30 dias após a migração como fallback.

#### 2.8 (Recomendado) Configurar CloudFront na frente do S3

O CloudFront melhora a performance das imagens com cache global e habilita HTTPS sem expor o bucket diretamente.

No console AWS → CloudFront → Create Distribution:

```
Origin Domain: fleet-photos-suaempresa.s3.sa-east-1.amazonaws.com
Origin Access: Origin access control (OAC)  ← mais seguro que público
Viewer Protocol Policy: Redirect HTTP to HTTPS
Cache Policy: CachingOptimized
```

Após criar, atualizar a variável `AWS_CLOUDFRONT_URL` com o domínio gerado
(ex: `https://xxxxxxxx.cloudfront.net`).

---

## Checklist de Migração

### Domínio
- [ ] Adicionar domínio no Vercel (ou no novo host)
- [ ] Criar registro DNS no provedor
- [ ] Verificar propagação DNS
- [ ] Confirmar HTTPS funcionando
- [ ] (Opcional) Redirecionar domínio antigo

### Storage S3
- [ ] Criar bucket S3
- [ ] Criar usuário IAM com política mínima
- [ ] Gerar Access Key + Secret Key
- [ ] Adicionar variáveis de ambiente no host
- [ ] Instalar `@aws-sdk/client-s3`
- [ ] Criar `src/app/api/upload/route.ts`
- [ ] Atualizar `checkout/page.tsx` — trocar função uploadPhotos
- [ ] Atualizar `checkin/page.tsx` — trocar função uploadPhotos
- [ ] (Opcional) Configurar CloudFront
- [ ] Executar script de migração das fotos existentes
- [ ] Verificar exibição das fotos antigas (banco atualizado com novas URLs)
- [ ] Testar fluxo completo de checkout + checkin com novas fotos
- [ ] Manter bucket Supabase por 30 dias como fallback
- [ ] Remover bucket Supabase após validação

---

## Variáveis de ambiente — antes e depois

| Variável | Atual (Supabase) | Após migração S3 |
|---------|-----------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Mantém | Mantém (banco ainda é Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Mantém | Mantém |
| `SUPABASE_SERVICE_ROLE_KEY` | Mantém | Mantém |
| `ADMIN_PASSWORD` | Mantém | Mantém |
| `AWS_REGION` | — | `sa-east-1` |
| `AWS_ACCESS_KEY_ID` | — | Key do usuário IAM |
| `AWS_SECRET_ACCESS_KEY` | — | Secret do usuário IAM |
| `AWS_S3_BUCKET` | — | Nome do bucket |
| `AWS_CLOUDFRONT_URL` | — | URL do CloudFront (se configurado) |

> O banco de dados (PostgreSQL via Supabase) **não é alterado** nesta migração.
> Este guia cobre apenas storage e domínio.
> Para migrar o banco e o host completo, consultar o roadmap em `ARCHITECTURE.md`.

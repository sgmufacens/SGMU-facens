# Guia de MigraÃ§Ã£o â€” SGMU

Este documento descreve os passos para migrar o SGMU do ambiente atual
(Supabase Storage + Vercel) para infraestrutura prÃ³pria da empresa, cobrindo:

1. **Troca de domÃ­nio** (domÃ­nio prÃ³prio, independente de onde o app estiver hospedado)
2. **Storage de imagens: Supabase â†’ AWS S3**

> As seÃ§Ãµes estÃ£o ordenadas do menor para o maior impacto. Recomenda-se seguir essa ordem.

---

## Parte 1 â€” Troca de DomÃ­nio

### PrÃ©-requisitos
- Acesso ao painel de DNS do domÃ­nio (ex: Route 53, Registro.br, Cloudflare)
- Acesso ao painel do Vercel (enquanto o host ainda for Vercel)

### Passo a passo

#### 1.1 Adicionar o domÃ­nio no Vercel

No painel Vercel â†’ Settings â†’ Domains â†’ Add Domain:

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

> Se for domÃ­nio raiz (sem subdomÃ­nio), usar registro `A` com o IP fornecido pelo Vercel.

#### 1.3 Aguardar propagaÃ§Ã£o

Normalmente leva de 5 minutos a 2 horas. Verificar com:

```bash
nslookup fleet.suaempresa.com.br
# ou
dig fleet.suaempresa.com.br
```

#### 1.4 Verificar HTTPS automÃ¡tico

O Vercel emite certificado SSL automaticamente via Let's Encrypt.
ApÃ³s a propagaÃ§Ã£o, `https://fleet.suaempresa.com.br` jÃ¡ estarÃ¡ funcionando.

#### 1.5 (Opcional) Redirecionar URL antiga

No Vercel â†’ Settings â†’ Domains, marcar o domÃ­nio antigo (`fleetapp-xi.vercel.app`)
como redirecionamento para o novo domÃ­nio.

---

## Parte 2 â€” MigraÃ§Ã£o de Storage: Supabase â†’ AWS S3

### VisÃ£o geral do que muda

| Hoje | ApÃ³s migraÃ§Ã£o |
|------|--------------|
| Supabase Storage (`fleet-photos`) | AWS S3 bucket |
| URL pÃºblica do Supabase | URL do S3 ou CloudFront |
| Upload via `supabase.storage` | Upload via `@aws-sdk/client-s3` |

### Arquivos que precisam ser alterados

```
src/app/(app)/checkout/page.tsx     â€” upload de fotos de saÃ­da
src/app/(app)/checkin/page.tsx      â€” upload de fotos de chegada
src/components/PhotoCapture.tsx     â€” (se o upload for centralizado aqui futuramente)
```

---

### Passo a passo

#### 2.1 Criar o bucket S3 na AWS

No console AWS â†’ S3 â†’ Create Bucket:

```
Nome:   fleet-photos-suaempresa
RegiÃ£o: sa-east-1 (SÃ£o Paulo)
```

**ConfiguraÃ§Ãµes recomendadas:**
- Block all public access: **DESATIVADO** (as fotos precisam ser acessÃ­veis para exibiÃ§Ã£o)
  - Ou manter bloqueado e usar CloudFront com OAC (mais seguro â€” ver seÃ§Ã£o 2.5)

#### 2.2 Criar usuÃ¡rio IAM para o app

No console AWS â†’ IAM â†’ Users â†’ Create User:

```
Nome: SGMU-app
```

PolÃ­tica a anexar (criar como inline policy):

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

Gerar **Access Key ID** e **Secret Access Key** â€” guardar com seguranÃ§a.

#### 2.3 Adicionar variÃ¡veis de ambiente

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

Criar `src/app/api/upload/route.ts` â€” o upload passa pelo servidor para nÃ£o expor as credenciais AWS no browser:

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
    return NextResponse.json({ error: 'Arquivo obrigatÃ³rio' }, { status: 400 })
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
// ANTES â€” Supabase Storage
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

// DEPOIS â€” AWS S3 via API Route
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

Aplicar a mesma mudanÃ§a em `src/app/(app)/checkin/page.tsx`.

#### 2.7 Migrar fotos existentes do Supabase para o S3

As fotos jÃ¡ registradas no banco tÃªm URLs do Supabase. Para migrÃ¡-las:

```bash
# 1. Listar todos os objetos no bucket do Supabase
# (via painel Supabase â†’ Storage â†’ fleet-photos)

# 2. Baixar cada arquivo e re-enviar para o S3
# Script de migraÃ§Ã£o (Node.js):
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

> **Nota:** Este script deve ser executado uma Ãºnica vez antes de remover o bucket do Supabase.
> Manter o bucket do Supabase ativo por pelo menos 30 dias apÃ³s a migraÃ§Ã£o como fallback.

#### 2.8 (Recomendado) Configurar CloudFront na frente do S3

O CloudFront melhora a performance das imagens com cache global e habilita HTTPS sem expor o bucket diretamente.

No console AWS â†’ CloudFront â†’ Create Distribution:

```
Origin Domain: fleet-photos-suaempresa.s3.sa-east-1.amazonaws.com
Origin Access: Origin access control (OAC)  â† mais seguro que pÃºblico
Viewer Protocol Policy: Redirect HTTP to HTTPS
Cache Policy: CachingOptimized
```

ApÃ³s criar, atualizar a variÃ¡vel `AWS_CLOUDFRONT_URL` com o domÃ­nio gerado
(ex: `https://xxxxxxxx.cloudfront.net`).

---

## Checklist de MigraÃ§Ã£o

### DomÃ­nio
- [ ] Adicionar domÃ­nio no Vercel (ou no novo host)
- [ ] Criar registro DNS no provedor
- [ ] Verificar propagaÃ§Ã£o DNS
- [ ] Confirmar HTTPS funcionando
- [ ] (Opcional) Redirecionar domÃ­nio antigo

### Storage S3
- [ ] Criar bucket S3
- [ ] Criar usuÃ¡rio IAM com polÃ­tica mÃ­nima
- [ ] Gerar Access Key + Secret Key
- [ ] Adicionar variÃ¡veis de ambiente no host
- [ ] Instalar `@aws-sdk/client-s3`
- [ ] Criar `src/app/api/upload/route.ts`
- [ ] Atualizar `checkout/page.tsx` â€” trocar funÃ§Ã£o uploadPhotos
- [ ] Atualizar `checkin/page.tsx` â€” trocar funÃ§Ã£o uploadPhotos
- [ ] (Opcional) Configurar CloudFront
- [ ] Executar script de migraÃ§Ã£o das fotos existentes
- [ ] Verificar exibiÃ§Ã£o das fotos antigas (banco atualizado com novas URLs)
- [ ] Testar fluxo completo de checkout + checkin com novas fotos
- [ ] Manter bucket Supabase por 30 dias como fallback
- [ ] Remover bucket Supabase apÃ³s validaÃ§Ã£o

---

## VariÃ¡veis de ambiente â€” antes e depois

| VariÃ¡vel | Atual (Supabase) | ApÃ³s migraÃ§Ã£o S3 |
|---------|-----------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | MantÃ©m | MantÃ©m (banco ainda Ã© Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | MantÃ©m | MantÃ©m |
| `SUPABASE_SERVICE_ROLE_KEY` | MantÃ©m | MantÃ©m |
| `ADMIN_PASSWORD` | MantÃ©m | MantÃ©m |
| `AWS_REGION` | â€” | `sa-east-1` |
| `AWS_ACCESS_KEY_ID` | â€” | Key do usuÃ¡rio IAM |
| `AWS_SECRET_ACCESS_KEY` | â€” | Secret do usuÃ¡rio IAM |
| `AWS_S3_BUCKET` | â€” | Nome do bucket |
| `AWS_CLOUDFRONT_URL` | â€” | URL do CloudFront (se configurado) |

> O banco de dados (PostgreSQL via Supabase) **nÃ£o Ã© alterado** nesta migraÃ§Ã£o.
> Este guia cobre apenas storage e domÃ­nio.
> Para migrar o banco e o host completo, consultar o roadmap em `ARCHITECTURE.md`.

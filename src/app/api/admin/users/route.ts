export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function isAdminAuthorized(req: NextRequest): boolean {
  const session = req.cookies.get('admin_session')?.value ?? ''
  return session.length > 0 && session === (process.env.ADMIN_PASSWORD ?? '').trim()
}

// POST /api/admin/users — cria auth user e vincula ao collaborator
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { email, password, collaboratorId } = await req.json()

  if (!email || !password || !collaboratorId) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Cria usuário no Supabase Auth
  const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !user) {
    return NextResponse.json({ error: createError?.message ?? 'Erro ao criar usuário' }, { status: 400 })
  }

  // Vincula o user_id ao collaborator
  const { error: updateError } = await supabaseAdmin
    .from('collaborators')
    .update({ user_id: user.id })
    .eq('id', collaboratorId)

  if (updateError) {
    await supabaseAdmin.auth.admin.deleteUser(user.id)
    return NextResponse.json({ error: 'Erro ao vincular colaborador' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId: user.id })
}

// DELETE /api/admin/users — remove acesso de um collaborator
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { collaboratorId } = await req.json()
  const supabaseAdmin = getSupabaseAdmin()

  const { data: collab } = await supabaseAdmin
    .from('collaborators')
    .select('user_id')
    .eq('id', collaboratorId)
    .single()

  if (!collab?.user_id) {
    return NextResponse.json({ error: 'Colaborador sem acesso configurado' }, { status: 400 })
  }

  await supabaseAdmin.auth.admin.deleteUser(collab.user_id)
  await supabaseAdmin.from('collaborators').update({ user_id: null }).eq('id', collaboratorId)

  return NextResponse.json({ ok: true })
}

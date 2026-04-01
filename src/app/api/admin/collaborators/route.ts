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

// GET /api/admin/collaborators — lista colaboradores com filial
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('collaborators')
    .select('*, branch:branches(name, city)')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/collaborators — cria colaborador
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { name, badge_number, branch_id } = await req.json()
  if (!name || !badge_number) {
    return NextResponse.json({ error: 'Nome e setor são obrigatórios' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('collaborators')
    .insert({ name, badge_number, branch_id: branch_id || null, is_active: true })
    .select('*, branch:branches(name, city)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT /api/admin/collaborators — atualiza colaborador
export async function PUT(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id, name, badge_number, branch_id, is_active } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const supabaseAdmin = getSupabaseAdmin()
  const payload: Record<string, any> = {}
  if (name !== undefined) payload.name = name
  if (badge_number !== undefined) payload.badge_number = badge_number
  if (branch_id !== undefined) payload.branch_id = branch_id || null
  if (is_active !== undefined) payload.is_active = is_active

  const { data, error } = await supabaseAdmin
    .from('collaborators')
    .update(payload)
    .eq('id', id)
    .select('*, branch:branches(name, city)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

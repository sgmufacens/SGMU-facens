import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// POST /api/schedules/expire
// Cancela todos os agendamentos confirmados cujo horário de saída já passou.
// Chamado automaticamente ao carregar a página de agendamentos.
export async function POST() {
  const now = new Date().toISOString()

  const { error, count } = await supabaseAdmin
    .from('schedules')
    .update({ status: 'cancelled' })
    .eq('status', 'confirmed')
    .lt('scheduled_departure', now)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cancelled: count ?? 0 })
}

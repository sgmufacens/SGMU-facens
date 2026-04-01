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

// POST /api/checkin — fecha a trip e libera o veículo usando SERVICE_ROLE_KEY (bypassa RLS)
export async function POST(req: NextRequest) {
  const { trip_id, vehicle_id, km_arrival, arrived_at, photos_arrival, notes_arrival } = await req.json()

  if (!trip_id || !vehicle_id || km_arrival === undefined || !arrived_at) {
    return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { error: tripError } = await supabaseAdmin
    .from('trips')
    .update({
      km_arrival,
      arrived_at,
      photos_arrival: photos_arrival ?? [],
      notes_arrival: notes_arrival ?? null,
      status: 'closed',
    })
    .eq('id', trip_id)

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 })
  }

  const { error: vehicleError } = await supabaseAdmin
    .from('vehicles')
    .update({ status: 'available' })
    .eq('id', vehicle_id)

  if (vehicleError) {
    return NextResponse.json({ error: vehicleError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

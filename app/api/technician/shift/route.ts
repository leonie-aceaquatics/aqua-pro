import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// POST { pool_id } — a technician starts an unrostered visit ("Visit any site" → Start shift).
// Creates a shift for them, already started, so hours are counted the same as a rostered one.
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pool_id } = await req.json()
  if (!pool_id) return NextResponse.json({ error: 'pool_id required' }, { status: 400 })

  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('shifts')
    .insert({
      staff_id: user.id, pool_id, shift_type: 'service_visit',
      scheduled_start: now, actual_start: now, status: 'in_progress',
      notes: 'Unrostered visit — started from the technician app',
    })
    .select('*, pools(name, address, suburb, pool_type, sanitiser_type, volume_litres, site_code)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shift: data })
}

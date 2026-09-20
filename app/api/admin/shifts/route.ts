import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { localDayRange } from '@/lib/local-time'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staff_id')
  const date = searchParams.get('date')

  let query = supabaseAdmin
    .from('shifts')
    .select('*, staff(first_name, last_name, role), pools(name, address, site_code)')
    .order('scheduled_start')

  if (staffId) query = query.eq('staff_id', staffId)
  if (date) {
    const { start, end } = localDayRange(date)
    query = query.gte('scheduled_start', start).lte('scheduled_start', end)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shifts: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('shifts')
    .insert({
      staff_id: body.staff_id,
      pool_id: body.pool_id || null,
      route_id: body.route_id || null,
      shift_type: body.shift_type,
      scheduled_start: body.scheduled_start,
      scheduled_end: body.scheduled_end || null,   // optional guide — techs log the real finish
      notes: body.notes || null,
    })
    .select('*, staff(first_name, last_name), pools(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shift: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  const { data, error } = await supabaseAdmin
    .from('shifts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shift: data })
}

// Admin / manager: remove a shift entirely (wrong day, wrong person, duplicate).
export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('shifts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { visibleOrgIds, visiblePoolIds, canAccessPool } from '@/lib/org-scope'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const poolId = searchParams.get('pool_id')

  let query = supabaseAdmin
    .from('risk_register_entries')
    .select('*, pools(name), owner:staff!owner_staff_id(first_name, last_name)')
    .order('created_at', { ascending: false })

  query = query.in('pool_id', await visiblePoolIds(user))
  if (poolId) query = query.eq('pool_id', poolId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.pool_id || !body.hazard_description) {
    return NextResponse.json({ error: 'pool_id and hazard_description are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('risk_register_entries')
    .insert({
      pool_id: body.pool_id,
      code: body.code || null,
      hazard_description: body.hazard_description,
      inherent_likelihood: body.inherent_likelihood || null,
      inherent_consequence: body.inherent_consequence || null,
      controls_in_place: body.controls_in_place || null,
      residual_likelihood: body.residual_likelihood || null,
      residual_consequence: body.residual_consequence || null,
      owner_staff_id: body.owner_staff_id || null,
      review_date: body.review_date || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const k of ['code', 'hazard_description', 'inherent_likelihood', 'inherent_consequence', 'controls_in_place', 'residual_likelihood', 'residual_consequence', 'owner_staff_id', 'review_date', 'status', 'notes']) {
    if (rest[k] !== undefined) updates[k] = rest[k] === '' ? null : rest[k]
  }

  const { data, error } = await supabaseAdmin
    .from('risk_register_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('risk_register_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

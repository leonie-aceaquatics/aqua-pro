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
    .from('corrective_actions')
    .select('*, pools(name), owner:staff!owner_staff_id(first_name, last_name)')
    .order('due_date', { ascending: true, nullsFirst: false })

  query = query.in('pool_id', await visiblePoolIds(user))
  if (poolId) query = query.eq('pool_id', poolId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-flag overdue on read, same pattern as compliance_events
  const today = new Date().toISOString().slice(0, 10)
  const items = (data ?? []).map(a => ({
    ...a,
    status: a.status === 'open' && a.due_date && a.due_date < today ? 'overdue' : a.status,
  }))

  return NextResponse.json({ actions: items })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.pool_id || !body.description) {
    return NextResponse.json({ error: 'pool_id and description are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('corrective_actions')
    .insert({
      pool_id: body.pool_id,
      code: body.code || null,
      source: body.source ?? 'internal',
      description: body.description,
      priority: body.priority ?? 'medium',
      owner_staff_id: body.owner_staff_id || null,
      due_date: body.due_date || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ action: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const k of ['code', 'description', 'priority', 'owner_staff_id', 'due_date', 'notes']) {
    if (rest[k] !== undefined) updates[k] = rest[k] || null
  }
  if (rest.status !== undefined) {
    updates.status = rest.status
    if (rest.status === 'completed') {
      updates.completed_at = new Date().toISOString()
      updates.completed_by = user.id
    }
  }

  const { data, error } = await supabaseAdmin
    .from('corrective_actions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ action: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('corrective_actions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

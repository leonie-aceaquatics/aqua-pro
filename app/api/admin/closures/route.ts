import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { visibleOrgIds, visiblePoolIds, canAccessPool } from '@/lib/org-scope'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('water_closures')
    .select('*, pools(name, site_code), closer:closed_by(first_name, last_name), reopener:reopened_by(first_name, last_name)')
    .in('pool_id', await visiblePoolIds(user))
    .order('closed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ closures: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!(await canAccessPool(user, body.pool_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('water_closures')
    .insert({
      pool_id: body.pool_id,
      closed_by: user.id,
      closure_reason: body.closure_reason,
      water_test_id: body.water_test_id || null,
      authority_notified: body.authority_notified ?? false,
      notes: body.notes || null,
    })
    .select('*, pools(name, site_code), closer:closed_by(first_name, last_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Write notification
  await supabaseAdmin.from('notifications').insert({
    pool_id: body.pool_id,
    type: 'pool_closure',
    title: `Pool closed: ${data.pools?.name}`,
    body: `Reason: ${body.closure_reason}`,
  })

  return NextResponse.json({ closure: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id } = body

  if (body.action === 'reopen') {
    const { data, error } = await supabaseAdmin
      .from('water_closures')
      .update({
        reopened_at: new Date().toISOString(),
        reopened_by: user.id,
        reopening_test_id: body.reopening_test_id || null,
        notes: body.notes || null,
      })
      .eq('id', id)
      .is('reopened_at', null)
      .select('*, pools(name)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ closure: data })
  }

  const { id: _id, action: _action, ...updates } = body
  const { data, error } = await supabaseAdmin
    .from('water_closures')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ closure: data })
}

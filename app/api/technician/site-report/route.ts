import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { canAccessPool, visiblePoolIds } from '@/lib/org-scope'

// Two things a technician needs to be able to say about a site that are not a reading and not a
// task: something is broken, and something ought to be done about it.
//
// A fault becomes an incident the office sees straight away. A recommendation is work worth
// quoting for, which is not urgent and is not a failure — it had nowhere to live before, so it
// stayed in someone's head. Both take photos, which is usually the whole point: a photo of a
// lifting grate argues the job better than a sentence does.
//
// The new row's id comes back so the photos can be attached to it.

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const q = new URL(req.url).searchParams
  const poolId = q.get('pool_id')
  let pools = await visiblePoolIds(user)
  if (poolId) {
    if (!pools.includes(poolId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    pools = [poolId]
  }

  const { data, error } = await supabaseAdmin
    .from('site_recommendations')
    .select('*, pools(name), raiser:staff!site_recommendations_raised_by_fkey(first_name, last_name)')
    .in('pool_id', pools)
    .order('raised_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recommendations: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  if (!(await canAccessPool(user, body.pool_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const title = String(body.title ?? '').trim()
  if (!title) return NextResponse.json({ error: 'Say what it is' }, { status: 400 })

  if (body.kind === 'fault') {
    const { data: pool } = await supabaseAdmin.from('pools').select('name').eq('id', body.pool_id).single()
    const { data, error } = await supabaseAdmin.from('incidents').insert({
      pool_id: body.pool_id,
      reported_by: user.id,
      incident_type: 'equipment_failure',
      severity: body.urgency === 'urgent' ? 'high' : 'medium',
      description: [title, body.detail?.trim()].filter(Boolean).join('\n\n'),
      occurred_at: new Date().toISOString(),
      status: 'open',
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // The office should not have to open the app to find out something is broken.
    await supabaseAdmin.from('notifications').insert({
      pool_id: body.pool_id, type: 'incident',
      title: `🔧 Fault reported — ${pool?.name ?? 'site'}`,
      body: title,
    })
    return NextResponse.json({ entity_type: 'incident', id: data.id })
  }

  const { data: pool } = await supabaseAdmin.from('pools').select('org_id').eq('id', body.pool_id).single()
  const { data, error } = await supabaseAdmin.from('site_recommendations').insert({
    pool_id: body.pool_id,
    org_id: pool?.org_id ?? null,
    raised_by: user.id,
    title,
    detail: body.detail?.trim() || null,
    urgency: ['urgent', 'soon', 'when_convenient'].includes(body.urgency) ? body.urgency : 'when_convenient',
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entity_type: 'recommendation', id: data.id })
}

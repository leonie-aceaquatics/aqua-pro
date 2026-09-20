import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { todayLocal, localDayRange } from '@/lib/local-time'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section')

  if (section === 'incidents') {
    const { data } = await supabaseAdmin
      .from('incidents')
      .select('*, pools(name)')
      .eq('status', 'open')
      .order('occurred_at', { ascending: false })
      .limit(20)
    return NextResponse.json({ incidents: data ?? [] })
  }

  // Overview stats
  const today = todayLocal()
  const { start: todayStart, end: todayEnd } = localDayRange(today)

  const [
    poolsRes,
    redRes, orangeRes,
    todayTestsRes,
    openIncidentsRes,
    overdueAssetsRes,
    complianceDueRes,
    activeTechRes,
  ] = await Promise.all([
    supabaseAdmin.from('pools').select('id', { count: 'exact' }).eq('is_active', true),
    // Red pools = latest test is red
    supabaseAdmin.from('water_tests').select('pool_id, risk_level, tested_at').eq('risk_level', 'red').order('tested_at', { ascending: false }).limit(100),
    supabaseAdmin.from('water_tests').select('pool_id, risk_level, tested_at').eq('risk_level', 'orange').order('tested_at', { ascending: false }).limit(100),
    supabaseAdmin.from('water_tests').select('id', { count: 'exact' }).gte('tested_at', todayStart).lte('tested_at', todayEnd),
    supabaseAdmin.from('incidents').select('id', { count: 'exact' }).eq('status', 'open'),
    supabaseAdmin.from('assets').select('id', { count: 'exact' }).lt('next_service_date', today).not('next_service_date', 'is', null),
    supabaseAdmin.from('compliance_events').select('id', { count: 'exact' }).lte('due_date', today).eq('status', 'pending'),
    supabaseAdmin.from('staff').select('id', { count: 'exact' }).in('role', ['technician']).eq('is_active', true),
  ])

  // Dedupe by pool — latest test per pool
  const latestRedPools = new Set<string>()
  redRes.data?.forEach(t => latestRedPools.add(t.pool_id))
  const latestOrangePools = new Set<string>()
  orangeRes.data?.forEach(t => { if (!latestRedPools.has(t.pool_id)) latestOrangePools.add(t.pool_id) })

  return NextResponse.json({
    stats: {
      totalPools: poolsRes.count ?? 0,
      redPools: latestRedPools.size,
      orangePools: latestOrangePools.size,
      todayTests: todayTestsRes.count ?? 0,
      openIncidents: openIncidentsRes.count ?? 0,
      assetsOverdue: overdueAssetsRes.count ?? 0,
      complianceDue: complianceDueRes.count ?? 0,
      activeTechnicians: activeTechRes.count ?? 0,
    },
  })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.type === 'incident') {
    const { data, error } = await supabaseAdmin
      .from('incidents')
      .insert({
        pool_id: body.pool_id,
        reported_by: user.id,
        incident_type: body.incident_type,
        severity: body.severity,
        description: body.description,
        immediate_action: body.immediate_action || null,
        authority_notified: body.authority_notified ?? false,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ incident: data })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...updates } = body

  if (['resolved', 'closed'].includes(updates.status) && !updates.resolved_at) {
    updates.resolved_at = new Date().toISOString()
    updates.resolved_by = user.id
  }

  const { data, error } = await supabaseAdmin
    .from('incidents')
    .update(updates)
    .eq('id', id)
    .select('*, pools(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ incident: data })
}

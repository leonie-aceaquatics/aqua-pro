import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { canAccessPool } from '@/lib/org-scope'
import { localDayRange, todayLocal } from '@/lib/local-time'

// Everything the client portal needs for one body of water: its targets, its rounds, how it is
// dosed, and what has already been recorded today (so the round list can show what is left, and
// the acid dose counter knows how many have gone in).
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const poolId = new URL(req.url).searchParams.get('pool_id')
  if (!poolId) return NextResponse.json({ error: 'pool_id required' }, { status: 400 })
  if (!(await canAccessPool(user, poolId))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const day = todayLocal()
  const { start, end } = localDayRange(day)

  const [{ data: pool }, { data: targets }, { data: rounds }, { data: tests }, { data: doses }] = await Promise.all([
    supabaseAdmin.from('pools').select('*').eq('id', poolId).single(),
    supabaseAdmin.from('pool_water_targets').select('*').eq('pool_id', poolId),
    supabaseAdmin.from('pool_rounds').select('*').eq('pool_id', poolId).order('sort_order'),
    supabaseAdmin.from('water_tests')
      .select('id, tested_at, round_key, is_retest, retest_of, free_chlorine, total_chlorine, combined_chlorine, ph, total_alkalinity, temperature_c, clarity_floor_visible, bather_count, risk_level, staff:tested_by(first_name)')
      .eq('pool_id', poolId).gte('tested_at', start).lte('tested_at', end).order('tested_at'),
    // Acid doses today, for the two-dose cap
    supabaseAdmin.from('chemical_usage_log')
      .select('id, applied_at, quantity, chemicals(name)')
      .eq('pool_id', poolId).gte('applied_at', start).lte('applied_at', end),
  ])

  if (!pool) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const acidDosesToday = (doses ?? []).filter((d: any) => {
    const name = (Array.isArray(d.chemicals) ? d.chemicals[0]?.name : d.chemicals?.name) ?? ''
    return /acid|bisulphate|bisulfate/i.test(name)
  }).length

  return NextResponse.json({
    pool, targets: targets ?? [], rounds: rounds ?? [], tests: tests ?? [], acidDosesToday, day,
  })
}

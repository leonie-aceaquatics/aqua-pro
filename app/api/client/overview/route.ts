import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { visiblePoolIds } from '@/lib/org-scope'
import { localDayRange, todayLocal } from '@/lib/local-time'
import { bathStatus } from '@/lib/bath-status'

// The client's front page: their bodies of water, each with today's state — open, not open yet,
// or closed — plus anything overdue. Worked out here rather than in the browser so the same
// answer reaches the portal, a report and anything else that needs it.
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const poolIds = await visiblePoolIds(user)
  if (!poolIds.length) return NextResponse.json({ pools: [] })

  const day = todayLocal()
  const { start, end } = localDayRange(day)

  const [{ data: pools }, { data: targets }, { data: rounds }, { data: tests }] = await Promise.all([
    supabaseAdmin.from('pools').select('*').in('id', poolIds).eq('is_active', true).order('name'),
    supabaseAdmin.from('pool_water_targets').select('*').in('pool_id', poolIds),
    supabaseAdmin.from('pool_rounds').select('*').in('pool_id', poolIds).order('sort_order'),
    supabaseAdmin.from('water_tests')
      .select('id, pool_id, tested_at, round_key, is_retest, free_chlorine, total_chlorine, combined_chlorine, ph, clarity_floor_visible, calibration_pass')
      .in('pool_id', poolIds).gte('tested_at', start).lte('tested_at', end).order('tested_at'),
  ])

  // One meter per site, so a calibration result recorded against any bath covers them all.
  const calibration = (tests ?? []).find((t: any) => t.calibration_pass !== null && t.calibration_pass !== undefined)

  const out = (pools ?? []).map(p => ({
    ...p,
    status: bathStatus(
      (tests ?? []).filter((t: any) => t.pool_id === p.id),
      (rounds ?? []).filter((r: any) => r.pool_id === p.id),
      (targets ?? []).filter((t: any) => t.pool_id === p.id),
      { calibrationPass: calibration?.calibration_pass ?? null, maxGapHours: p.max_round_gap_hours },
    ),
  }))

  return NextResponse.json({ pools: out, day, calibrationToday: calibration ? { pass: calibration.calibration_pass, at: calibration.tested_at } : null })
}

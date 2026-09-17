import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { calculateLSI, calculateDoses, classifyRisk } from '@/lib/water-chemistry'
import type { PoolType, SanitiserType, WaterTestValues, PhCorrectionMethod } from '@/lib/water-chemistry'

// Standalone "what do I need to add right now" tool — surfaces calculateLSI()/calculateDoses(),
// which existed in lib/water-chemistry.ts but were never called from any page before this.
// Deliberately does NOT write a water_tests row — this is a scratch calculation, not a logged test.
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.pool_id) return NextResponse.json({ error: 'pool_id required' }, { status: 400 })

  const { data: pool, error } = await supabaseAdmin
    .from('pools')
    .select('pool_type, sanitiser_type, volume_litres, ph_correction_method, close_threshold_free_chlorine, close_threshold_ph_low, close_threshold_ph_high')
    .eq('id', body.pool_id)
    .single()
  if (error || !pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
  if (!pool.volume_litres) return NextResponse.json({ error: 'This pool has no volume set — dosing calculations need a real volume to work from.' }, { status: 400 })

  const values: WaterTestValues = {
    freeChlorine: body.free_chlorine ?? undefined,
    ph: body.ph ?? undefined,
    totalAlkalinity: body.total_alkalinity ?? undefined,
    calciumHardness: body.calcium_hardness ?? undefined,
    cyanuricAcid: body.cyanuric_acid ?? undefined,
    saltLevel: body.salt_level ?? undefined,
    temperatureC: body.temperature_c ?? undefined,
  }

  const poolType = pool.pool_type as PoolType
  const sanitiserType = pool.sanitiser_type as SanitiserType
  const correctionMethod = (pool.ph_correction_method ?? 'acid') as PhCorrectionMethod

  const doses = calculateDoses(values, poolType, sanitiserType, Number(pool.volume_litres), correctionMethod)
  const risk = classifyRisk(values, poolType, sanitiserType, {
    closeThresholdFreeChlorine: pool.close_threshold_free_chlorine,
    closeThresholdPhLow: pool.close_threshold_ph_low,
    closeThresholdPhHigh: pool.close_threshold_ph_high,
  })

  let lsi: number | null = null
  if (values.ph != null && values.temperatureC != null && values.calciumHardness != null && values.totalAlkalinity != null) {
    lsi = calculateLSI(values.ph, values.temperatureC, values.calciumHardness, values.totalAlkalinity, {
      cyanuricAcid: values.cyanuricAcid, tds: values.totalDissolvedSolids,
    })
  }

  return NextResponse.json({ lsi, doses, risk, ph_correction_method: correctionMethod })
}

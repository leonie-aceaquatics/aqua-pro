import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { sendWaterTestResultsEmail } from '@/lib/email'
import { logChemicalUsage } from '@/lib/chemical-usage'
import { classifyRisk, calculateLSI } from '@/lib/water-chemistry'
import type { PoolType, SanitiserType, WaterTestValues } from '@/lib/water-chemistry'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const poolId = searchParams.get('pool_id')
  const riskLevel = searchParams.get('risk_level')
  const limit = Number(searchParams.get('limit') ?? 50)

  let query = supabaseAdmin
    .from('water_tests')
    .select('*, pools(name, pool_type, sanitiser_type, volume_litres), staff(first_name, last_name)')
    .order('tested_at', { ascending: false })
    .limit(limit)

  if (poolId) query = query.eq('pool_id', poolId)
  if (riskLevel) query = query.eq('risk_level', riskLevel)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tests: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Combined chlorine is derived, not measured: DPD1 gives free, DPD3 gives total,
  // combined (chloramines) = total - free. Always recompute when both are present.
  if (body.free_chlorine != null && body.total_chlorine != null) {
    body.combined_chlorine = Math.max(0, Math.round((Number(body.total_chlorine) - Number(body.free_chlorine)) * 100) / 100)
  }

  // Fetch pool for type/sanitiser info
  const { data: pool } = await supabaseAdmin
    .from('pools')
    .select('pool_type, sanitiser_type, volume_litres, close_threshold_free_chlorine, close_threshold_ph_low, close_threshold_ph_high')
    .eq('id', body.pool_id)
    .single()

  const values: WaterTestValues = {
    freeChlorine: body.free_chlorine ?? undefined,
    combinedChlorine: body.combined_chlorine ?? undefined,
    totalChlorine: body.total_chlorine ?? undefined,
    bromine: body.bromine ?? undefined,
    ph: body.ph ?? undefined,
    totalAlkalinity: body.total_alkalinity ?? undefined,
    calciumHardness: body.calcium_hardness ?? undefined,
    cyanuricAcid: body.cyanuric_acid ?? undefined,
    totalDissolvedSolids: body.total_dissolved_solids ?? undefined,
    saltLevel: body.salt_level ?? undefined,
    phosphates: body.phosphates ?? undefined,
    temperatureC: body.temperature_c ?? undefined,
    turbidity: body.turbidity ?? undefined,
  }

  const poolType = (pool?.pool_type ?? 'outdoor') as PoolType
  const sanitiserType = (pool?.sanitiser_type ?? 'chlorine') as SanitiserType
  const { riskLevel, flags } = classifyRisk(values, poolType, sanitiserType, {
    closeThresholdFreeChlorine: pool?.close_threshold_free_chlorine,
    closeThresholdPhLow: pool?.close_threshold_ph_low,
    closeThresholdPhHigh: pool?.close_threshold_ph_high,
  })

  // LSI needs pH, temperature, calcium hardness and alkalinity; CYA and TDS refine it when present
  const lsi = body.ph != null && body.temperature_c != null && body.calcium_hardness != null && body.total_alkalinity != null
    ? calculateLSI(Number(body.ph), Number(body.temperature_c), Number(body.calcium_hardness), Number(body.total_alkalinity), {
        cyanuricAcid: body.cyanuric_acid != null ? Number(body.cyanuric_acid) : undefined,
        tds: body.total_dissolved_solids != null ? Number(body.total_dissolved_solids) : undefined,
      })
    : null

  const { data, error } = await supabaseAdmin
    .from('water_tests')
    .insert({
      pool_id: body.pool_id,
      tested_by: user.id,
      test_source: body.test_source ?? 'manual',
      tested_at: body.tested_at ?? new Date().toISOString(),
      free_chlorine: body.free_chlorine ?? null,
      combined_chlorine: body.combined_chlorine ?? null,
      total_chlorine: body.total_chlorine ?? null,
      bromine: body.bromine ?? null,
      ph: body.ph ?? null,
      total_alkalinity: body.total_alkalinity ?? null,
      calcium_hardness: body.calcium_hardness ?? null,
      cyanuric_acid: body.cyanuric_acid ?? null,
      total_dissolved_solids: body.total_dissolved_solids ?? null,
      salt_level: body.salt_level ?? null,
      phosphates: body.phosphates ?? null,
      temperature_c: body.temperature_c ?? null,
      turbidity: body.turbidity ?? null,
      uv_output_pct: body.uv_output_pct ?? null,
      uv_run_hours: body.uv_run_hours ?? null,
      langelier_saturation_index: lsi,
      risk_level: riskLevel,
      risk_flags: flags,
      notes: body.notes ?? null,
      // Chemtrol / controller screen values at the time of the manual test, and whether it was calibrated
      controller_ph: body.controller_ph ?? null,
      controller_fcl: body.controller_fcl ?? null,
      calibrate_ph: body.calibrate_ph ?? null,
      calibrate_fcl: body.calibrate_fcl ?? null,
      fault_report: body.fault_report?.trim() || null,
    })
    .select('*, pools(name, pool_type, sanitiser_type, volume_litres)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Chemicals added at this test — logged as usage against the test so stock comes down
  const doses = (body.doses ?? []) as { chemical_id: string; quantity: number | string }[]
  const dosesLogged: any[] = []
  for (const d of doses) {
    if (!d.chemical_id || !(Number(d.quantity) > 0)) continue
    try {
      dosesLogged.push(await logChemicalUsage({
        pool_id: body.pool_id, chemical_id: d.chemical_id, quantity: Number(d.quantity),
        applied_by: user.id, applied_at: data.tested_at, water_test_id: data.id,
      }))
    } catch (e) { console.error('Dose log failed:', e) }
  }

  // A fault / breakdown reported with the test becomes an open incident so the office sees it
  if (data.fault_report) {
    const { data: incident } = await supabaseAdmin.from('incidents').insert({
      pool_id: body.pool_id, reported_by: user.id, incident_type: 'equipment_failure', severity: 'medium',
      description: data.fault_report, occurred_at: data.tested_at, status: 'open',
    }).select('id').single()
    supabaseAdmin.from('notifications').insert({
      pool_id: body.pool_id, type: 'incident',
      title: `🔧 Fault reported — ${data?.pools?.name}`,
      body: data.fault_report,
    }).then(() => {})
    if (incident) data.incident_id = incident.id
  }

  // Alert if red/orange risk
  if (riskLevel === 'red' || riskLevel === 'orange') {
    // Fire-and-forget notification
    supabaseAdmin.from('notifications').insert({
      pool_id: body.pool_id,
      type: 'water_risk',
      title: `${riskLevel === 'red' ? '🚨 CLOSE POOL' : '⚠️ Action Required'} — ${data?.pools?.name}`,
      body: `Water test flagged ${flags.join(', ')} as out of range.`,
    }).then(() => {})
  }

  // Every result goes to the office inbox. Sent after the response so a slow SMTP
  // round-trip never delays the save; the helper swallows send failures.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const testedBy = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
  after(() => sendWaterTestResultsEmail({ ...data, doses: dosesLogged }, data?.pools?.name ?? 'Unknown pool', testedBy, `${appUrl}/admin`))

  return NextResponse.json({ test: data })
}

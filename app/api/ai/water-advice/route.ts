import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { canAccessPool } from '@/lib/org-scope'
import { getWaterAdvice } from '@/lib/ai'
import type { PoolType, SanitiserType, WaterTestValues } from '@/lib/water-chemistry'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { testId } = await req.json()

  const { data: test, error } = await supabaseAdmin
    .from('water_tests')
    .select('*, pools(name, pool_type, sanitiser_type, volume_litres)')
    .eq('id', testId)
    .single()

  if (error || !test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })
  if (!(await canAccessPool(user, test.pool_id))) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

  const values: WaterTestValues = {
    freeChlorine: test.free_chlorine ?? undefined,
    combinedChlorine: test.combined_chlorine ?? undefined,
    bromine: test.bromine ?? undefined,
    ph: test.ph ?? undefined,
    totalAlkalinity: test.total_alkalinity ?? undefined,
    calciumHardness: test.calcium_hardness ?? undefined,
    cyanuricAcid: test.cyanuric_acid ?? undefined,
    totalDissolvedSolids: test.total_dissolved_solids ?? undefined,
    saltLevel: test.salt_level ?? undefined,
    phosphates: test.phosphates ?? undefined,
    temperatureC: test.temperature_c ?? undefined,
    turbidity: test.turbidity ?? undefined,
  }

  const advice = await getWaterAdvice({
    poolName: test.pools?.name ?? 'Unknown Pool',
    poolType: (test.pools?.pool_type ?? 'outdoor') as PoolType,
    sanitiserType: (test.pools?.sanitiser_type ?? 'chlorine') as SanitiserType,
    volumeLitres: test.pools?.volume_litres ?? 50000,
    values,
  })

  // Cache advice on the water test record
  await supabaseAdmin
    .from('water_tests')
    .update({ ai_advice: advice, ai_advice_generated_at: new Date().toISOString() })
    .eq('id', testId)

  return NextResponse.json({ advice })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { canAccessPool, visiblePoolIds } from '@/lib/org-scope'
import { getRanges } from '@/lib/water-chemistry'
import type { PoolType, SanitiserType } from '@/lib/water-chemistry'

// Assembles a WQRMP-style document from AquaPro's own live data for one pool — the actual
// "design WQRMP" ask, built on top of everything else in this migration (risk register,
// corrective actions, emergency contacts). Read-only — no storage/versioning of the assembled
// document yet, it's generated fresh from current data each time and printed/saved as PDF from
// the browser, same pattern as the existing /sales page.
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const poolId = searchParams.get('pool_id')
  if (!poolId) return NextResponse.json({ error: 'pool_id required' }, { status: 400 })
  if (!(await canAccessPool(user, poolId))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [poolRes, assetsRes, complianceRes, correctiveRes, riskRes, contactsRes] = await Promise.all([
    supabaseAdmin.from('pools').select('*').eq('id', poolId).single(),
    supabaseAdmin.from('assets').select('*, asset_categories(name)').eq('pool_id', poolId).eq('is_active', true),
    supabaseAdmin.from('compliance_requirements').select('*').or(`pool_id.eq.${poolId},pool_id.is.null`),
    supabaseAdmin.from('corrective_actions').select('*, owner:staff!owner_staff_id(first_name, last_name)').eq('pool_id', poolId),
    supabaseAdmin.from('risk_register_entries').select('*, owner:staff!owner_staff_id(first_name, last_name)').eq('pool_id', poolId),
    supabaseAdmin.from('pool_contacts').select('*').eq('pool_id', poolId).order('is_primary', { ascending: false }),
  ])

  if (poolRes.error || !poolRes.data) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
  const pool = poolRes.data

  const ranges = getRanges(pool.pool_type as PoolType, pool.sanitiser_type as SanitiserType)

  return NextResponse.json({
    pool,
    ranges,
    assets: assetsRes.data ?? [],
    compliance_requirements: complianceRes.data ?? [],
    corrective_actions: correctiveRes.data ?? [],
    risk_register: riskRes.data ?? [],
    contacts: contactsRes.data ?? [],
    generated_at: new Date().toISOString(),
  })
}

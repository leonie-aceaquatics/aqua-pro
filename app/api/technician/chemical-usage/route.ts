import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { canAccessPool } from '@/lib/org-scope'
import { logChemicalUsage } from '@/lib/chemical-usage'

// Recording what went into a body of water, without having to log a water test to do it.
//
// Plenty of chemical goes in on a visit that no reading asked for — algaecide, floc, a filter
// clean. Before this there was nowhere on the phone to put it, so it went in unrecorded and the
// site was never invoiced for it.
//
// GET returns the products ordered by how often they are actually used AT THIS SITE, with the
// amount used last time, so the common case is one tap rather than a hunt through a dropdown.
//
// This covers everything consumed at a site, not only what is dosed into the water. A spin disc
// or a scum block costs real money and is used up at one site, so it belongs in what that site
// costs to service. `dosable` only decides whether a product can be offered as a DOSE on the
// water test — nobody pours a disc into a pool — and is passed through for grouping.

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const poolId = new URL(req.url).searchParams.get('pool_id')
  if (!poolId) return NextResponse.json({ error: 'pool_id is required' }, { status: 400 })
  if (!(await canAccessPool(user, poolId))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [{ data: chemicals }, { data: history }] = await Promise.all([
    supabaseAdmin.from('chemicals')
      .select('id, name, unit, dose_unit, container_size, dosable')
      .eq('org_id', user.orgId).eq('is_active', true).order('name'),
    supabaseAdmin.from('chemical_usage_log')
      .select('chemical_id, quantity, applied_at')
      .eq('pool_id', poolId).order('applied_at', { ascending: false }).limit(300),
  ])

  // How often, and how much last time — the two things that make the next entry a single tap.
  const stats = new Map<string, { uses: number; last: number }>()
  for (const row of history ?? []) {
    const s = stats.get(row.chemical_id)
    if (s) s.uses += 1
    else stats.set(row.chemical_id, { uses: 1, last: Number(row.quantity) })   // first seen = most recent
  }

  const products = (chemicals ?? [])
    .map((c: any) => ({ ...c, uses: stats.get(c.id)?.uses ?? 0, last_quantity: stats.get(c.id)?.last ?? null }))
    .sort((a: any, b: any) => b.uses - a.uses || a.name.localeCompare(b.name))

  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  if (!(await canAccessPool(user, body.pool_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const items = (body.items ?? []) as { chemical_id: string; quantity: number | string }[]
  const valid = items.filter(i => i.chemical_id && Number(i.quantity) > 0)
  if (!valid.length) return NextResponse.json({ error: 'Nothing to record' }, { status: 400 })

  const logged: any[] = []
  const errors: string[] = []
  for (const i of valid) {
    try {
      logged.push(await logChemicalUsage({
        pool_id: body.pool_id, chemical_id: i.chemical_id, quantity: Number(i.quantity),
        applied_by: user.id, notes: body.notes?.trim() || null,
      }))
    } catch (e) {
      // Never swallowed: unrecorded chemical is chemical the site is not invoiced for.
      errors.push(e instanceof Error ? e.message : 'unknown error')
    }
  }
  if (!logged.length) return NextResponse.json({ error: errors[0] ?? 'Could not record this' }, { status: 500 })
  return NextResponse.json({ logged: logged.length, errors })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { queueIfLowStockAtSite } from '@/lib/chemical-orders'

// Per-site chemical stock.
// GET  ?pool_id     — every active chemical with that site's quantity + last count (any staff)
// GET               — all sites × all chemicals for the admin matrix (admin/manager)
// POST { pool_id, counts: [{ chemical_id, quantity }] } — a stock count at a site (any staff)

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const poolId = new URL(req.url).searchParams.get('pool_id')

  const { data: chemicals, error: cErr } = await supabaseAdmin
    .from('chemicals')
    .select('id, name, type, unit, reorder_point')
    .eq('is_active', true)
    .order('name')
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  if (poolId) {
    const { data: stock, error } = await supabaseAdmin
      .from('site_chemical_stock')
      .select('chemical_id, quantity, last_counted_at, counter:last_counted_by(first_name, last_name)')
      .eq('pool_id', poolId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const byChem = new Map((stock ?? []).map((r: any) => [r.chemical_id, r]))
    const rows = (chemicals ?? []).map(c => {
      const r: any = byChem.get(c.id)
      return {
        chemical: c,
        quantity: r ? Number(r.quantity) : null,       // null = never counted here
        last_counted_at: r?.last_counted_at ?? null,
        last_counted_by: r?.counter ? `${r.counter.first_name} ${r.counter.last_name ?? ''}`.trim() : null,
        low: !!r && Number(c.reorder_point) > 0 && Number(r.quantity) <= Number(c.reorder_point),
      }
    })
    return NextResponse.json({ rows })
  }

  if (!['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const [{ data: pools, error: pErr }, { data: stock, error: sErr }] = await Promise.all([
    supabaseAdmin.from('pools').select('id, name').eq('is_active', true).order('name'),
    supabaseAdmin.from('site_chemical_stock').select('pool_id, chemical_id, quantity, last_counted_at'),
  ])
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
  return NextResponse.json({ chemicals, pools, stock })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const poolId = body.pool_id
  const counts = (body.counts ?? []) as { chemical_id: string; quantity: number | string }[]
  if (!poolId || counts.length === 0) return NextResponse.json({ error: 'pool_id and counts required' }, { status: 400 })

  const now = new Date().toISOString()
  const rows = counts
    .filter(c => c.chemical_id && c.quantity !== '' && c.quantity !== null && !isNaN(Number(c.quantity)))
    .map(c => ({
      pool_id: poolId, chemical_id: c.chemical_id, quantity: Math.max(0, Number(c.quantity)),
      last_counted_at: now, last_counted_by: user.id, updated_at: now,
    }))
  if (rows.length === 0) return NextResponse.json({ error: 'No counts entered' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('site_chemical_stock')
    .upsert(rows, { onConflict: 'pool_id,chemical_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await Promise.all(rows.map(r => queueIfLowStockAtSite(poolId, r.chemical_id)))
  return NextResponse.json({ ok: true, saved: rows.length })
}

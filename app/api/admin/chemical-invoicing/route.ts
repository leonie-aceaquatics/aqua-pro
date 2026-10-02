import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { visiblePoolIds } from '@/lib/org-scope'
import { localDayRange } from '@/lib/local-time'
import { buildSiteInvoices, invoicesToCsv, type UsageRow } from '@/lib/chemical-invoicing'

// Chemical used at each site over a period, totalled in litres and kilograms and priced at the
// charge rate — what an invoice is built from. ?format=csv returns a spreadsheet instead.
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = new URL(req.url).searchParams
  const from = q.get('from'), to = q.get('to')
  if (!from || !to) return NextResponse.json({ error: 'from and to are required' }, { status: 400 })

  const poolId = q.get('pool_id')
  let pools = await visiblePoolIds(user)
  if (poolId && poolId !== 'all') {
    if (!pools.includes(poolId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    pools = [poolId]
  }

  const { data, error } = await supabaseAdmin
    .from('chemical_usage_log')
    .select('pool_id, chemical_id, quantity, applied_at, pools(name), chemicals(name, dose_unit, unit, unit_cost, unit_charge)')
    .in('pool_id', pools)
    .gte('applied_at', localDayRange(from).start)
    .lte('applied_at', localDayRange(to).end)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const one = <T,>(v: T | T[] | null | undefined): T | undefined => Array.isArray(v) ? v[0] : (v ?? undefined)
  const rows: UsageRow[] = (data ?? []).map((r: any) => {
    const pool = one<any>(r.pools), chem = one<any>(r.chemicals)
    return {
      pool_id: r.pool_id, pool_name: pool?.name ?? 'Unknown site',
      chemical_id: r.chemical_id, chemical_name: chem?.name ?? 'Unknown chemical',
      dose_unit: chem?.dose_unit ?? chem?.unit ?? 'L',
      unit_cost: chem?.unit_cost ?? null, unit_charge: chem?.unit_charge ?? null,
      quantity: Number(r.quantity) || 0,
    }
  })

  const invoices = buildSiteInvoices(rows)

  if (q.get('format') === 'csv') {
    return new NextResponse(invoicesToCsv(invoices, from, to), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="chemical-usage-${from}-to-${to}.csv"`,
      },
    })
  }

  return NextResponse.json({
    from, to, invoices,
    totals: {
      charge: Math.round(invoices.reduce((s, i) => s + i.charge, 0) * 100) / 100,
      cost: Math.round(invoices.reduce((s, i) => s + i.cost, 0) * 100) / 100,
      margin: Math.round(invoices.reduce((s, i) => s + i.margin, 0) * 100) / 100,
    },
  })
}

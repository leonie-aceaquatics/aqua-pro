import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { visibleOrgIds, visiblePoolIds, canAccessPool } from '@/lib/org-scope'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const poolId = searchParams.get('pool_id')

  let assetsQuery = supabaseAdmin
    .from('assets')
    .select('*, pools(name), asset_categories(name, inspection_interval_days)')
    .eq('is_active', true)
    .order('next_service_date', { ascending: true, nullsFirst: false })

  assetsQuery = assetsQuery.in('pool_id', await visiblePoolIds(user))
  if (poolId) assetsQuery = assetsQuery.eq('pool_id', poolId)

  const [assetsRes, categoriesRes] = await Promise.all([
    assetsQuery,
    supabaseAdmin.from('asset_categories').select('*').order('name'),
  ])

  return NextResponse.json({ assets: assetsRes.data ?? [], categories: categoriesRes.data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager', 'technician'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('assets')
    .insert({
      pool_id: body.pool_id,
      category_id: body.category_id,
      name: body.name,
      manufacturer: body.manufacturer || null,
      model: body.model || null,
      serial_number: body.serial_number || null,
      install_date: body.install_date || null,
      warranty_expiry: body.warranty_expiry || null,
      expected_lifespan_years: body.expected_lifespan_years ? Number(body.expected_lifespan_years) : null,
      replacement_cost: body.replacement_cost ? Number(body.replacement_cost) : null,
      condition: body.condition ?? 'good',
      location_description: body.location_description || null,
      next_service_date: body.next_service_date || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager', 'technician'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const key of [
    'pool_id', 'category_id', 'name', 'manufacturer', 'model', 'serial_number',
    'install_date', 'warranty_expiry', 'condition', 'location_description',
    'next_service_date', 'notes', 'is_active',
  ]) {
    if (key in rest) updates[key] = rest[key] || null
  }
  if ('expected_lifespan_years' in rest) updates.expected_lifespan_years = rest.expected_lifespan_years ? Number(rest.expected_lifespan_years) : null
  if ('replacement_cost' in rest) updates.replacement_cost = rest.replacement_cost ? Number(rest.replacement_cost) : null
  if ('is_active' in rest) updates.is_active = rest.is_active

  const { data, error } = await supabaseAdmin
    .from('assets')
    .update(updates)
    .eq('id', id)
    .select('*, pools(name), asset_categories(name, inspection_interval_days)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { queueIfLowStock } from '@/lib/chemical-orders'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section')

  if (section === 'usage') {
    const { data, error } = await supabaseAdmin
      .from('chemical_usage_log')
      .select('*, chemicals(name, unit, dose_unit, type), pools(name), applier:applied_by(first_name, last_name)')
      .order('applied_at', { ascending: false })
      .limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ usage: data })
  }

  const { data, error } = await supabaseAdmin
    .from('chemicals')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ chemicals: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (body.action === 'log_usage') {
    const { data: usage, error: ue } = await supabaseAdmin
      .from('chemical_usage_log')
      .insert({
        pool_id: body.pool_id,
        chemical_id: body.chemical_id,
        water_test_id: body.water_test_id || null,
        applied_by: user.id,
        applied_at: body.applied_at || new Date().toISOString(),
        quantity: body.quantity,
        notes: body.notes || null,
      })
      .select('*, chemicals(name, unit, dose_unit), pools(name)')
      .single()
    if (ue) return NextResponse.json({ error: ue.message }, { status: 500 })

    // Decrement stock. Quantity is in dose units (L/kg); stock is in containers (drum/bag),
    // so convert via container_size. No container_size = 1:1 (dose unit is the stock unit).
    const { data: chem } = await supabaseAdmin
      .from('chemicals')
      .select('current_stock, container_size')
      .eq('id', body.chemical_id)
      .single()
    if (chem && chem.current_stock !== null) {
      const perContainer = Number(chem.container_size) > 0 ? Number(chem.container_size) : 1
      const used = Number(body.quantity) / perContainer
      await supabaseAdmin
        .from('chemicals')
        .update({ current_stock: Math.max(0, Math.round((Number(chem.current_stock) - used) * 100) / 100) })
        .eq('id', body.chemical_id)
      await queueIfLowStock(body.chemical_id)
    }
    return NextResponse.json({ usage })
  }

  if (body.action === 'update_stock') {
    const { data, error } = await supabaseAdmin
      .from('chemicals')
      .update({ current_stock: body.current_stock })
      .eq('id', body.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await queueIfLowStock(body.id)
    return NextResponse.json({ chemical: data })
  }

  if (body.action === 'stock_take') {
    const counts = body.counts as { id: string; current_stock: number }[]
    const results = await Promise.all(counts.map(c =>
      supabaseAdmin.from('chemicals').update({ current_stock: c.current_stock }).eq('id', c.id).select().single()
    ))
    const error = results.find(r => r.error)?.error
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await Promise.all(counts.map(c => queueIfLowStock(c.id)))
    return NextResponse.json({ chemicals: results.map(r => r.data) })
  }

  // Create chemical
  const { data, error } = await supabaseAdmin
    .from('chemicals')
    .insert({
      name: body.name,
      type: body.type,
      unit: body.unit ?? 'L',
      dose_unit: body.dose_unit ?? body.unit ?? 'L',
      container_size: body.container_size ? Number(body.container_size) : null,
      current_stock: body.current_stock ?? 0,
      reorder_point: body.reorder_point ?? 0,
      supplier: body.supplier || null,
      safety_data_sheet_url: body.safety_data_sheet_url || null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ chemical: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...updates } = body
  if ('container_size' in updates) updates.container_size = updates.container_size ? Number(updates.container_size) : null
  const { data, error } = await supabaseAdmin
    .from('chemicals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if ('current_stock' in updates || 'reorder_point' in updates) await queueIfLowStock(id)
  return NextResponse.json({ chemical: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const includeReceived = searchParams.get('include_received') === 'true'

  let query = supabaseAdmin
    .from('chemical_orders')
    .select('*, chemicals(name, unit, supplier, current_stock, reorder_point), pools(name), staff:ordered_by(first_name, last_name)')
    .order('added_at', { ascending: false })

  if (!includeReceived) query = query.in('status', ['pending', 'ordered'])

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('chemical_orders')
    .insert({
      chemical_id: body.chemical_id,
      pool_id: body.pool_id || null,
      quantity_needed: body.quantity_needed ? Number(body.quantity_needed) : null,
      notes: body.notes || null,
    })
    .select('*, chemicals(name, unit, supplier, current_stock, reorder_point), pools(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ order: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  if (updates.status === 'ordered' && !updates.ordered_at) {
    updates.ordered_at = new Date().toISOString()
    updates.ordered_by = user.id
  }
  if (updates.status === 'received' && !updates.received_at) {
    updates.received_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('chemical_orders')
    .update(updates)
    .eq('id', id)
    .select('*, chemicals(name, unit, supplier, current_stock, reorder_point), pools(name), staff:ordered_by(first_name, last_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ order: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('chemical_orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

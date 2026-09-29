import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { visibleOrgIds, visiblePoolIds, canAccessPool } from '@/lib/org-scope'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  // The log hangs off an asset, which hangs off a pool.
  const { data: asset } = await supabaseAdmin.from('assets').select('pool_id').eq('id', id).single()
  if (!asset || !(await canAccessPool(user, asset.pool_id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('asset_service_log')
    .select('*, tech:serviced_by(first_name, last_name)')
    .eq('asset_id', id)
    .order('service_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession()
  if (!user || !['admin', 'manager', 'technician'].includes(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('asset_service_log')
    .insert({
      asset_id: id,
      serviced_by: user.id,
      service_date: body.service_date || new Date().toISOString().split('T')[0],
      service_type: body.service_type,
      description: body.description,
      parts_used: body.parts_used || null,
      cost: body.cost ? Number(body.cost) : null,
      next_service_date: body.next_service_date || null,
    })
    .select('*, tech:serviced_by(first_name, last_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.next_service_date) {
    await supabaseAdmin
      .from('assets')
      .update({ next_service_date: body.next_service_date })
      .eq('id', id)
  }

  return NextResponse.json({ log: data })
}

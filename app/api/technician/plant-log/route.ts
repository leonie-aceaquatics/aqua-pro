import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { canAccessPool, visiblePoolIds } from '@/lib/org-scope'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const poolId = searchParams.get('pool_id')
  const limit = parseInt(searchParams.get('limit') ?? '10')

  let query = supabaseAdmin
    .from('plant_logs')
    .select('*, logged_by_staff:logged_by(first_name, last_name)')
    .order('logged_at', { ascending: false })
    .limit(limit)

  query = query.in('pool_id', await visiblePoolIds(user))
  if (poolId) query = query.eq('pool_id', poolId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!(await canAccessPool(user, body.pool_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('plant_logs')
    .insert({ ...body, logged_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}

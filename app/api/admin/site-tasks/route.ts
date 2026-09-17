import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// Admin CRUD for the simple per-site task list. pool_id null = task applies to every site.

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const poolId = new URL(req.url).searchParams.get('pool_id')
  let query = supabaseAdmin
    .from('site_tasks')
    .select('*, pools(name)')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at')
  // 'all' = only the global tasks; a pool id = that pool's own tasks; nothing = everything
  if (poolId === 'all') query = query.is('pool_id', null)
  else if (poolId) query = query.eq('pool_id', poolId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const label = String(body.label ?? '').trim()
  if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('site_tasks')
    .insert({ label, pool_id: body.pool_id || null, sort_order: body.sort_order ?? 0, created_by: user.id })
    .select('*, pools(name)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Soft delete so past completions keep their label
  const { error } = await supabaseAdmin.from('site_tasks').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

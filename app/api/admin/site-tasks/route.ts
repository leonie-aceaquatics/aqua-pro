import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// Admin CRUD for the simple per-site task list. pool_id null = task applies to every site.

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const poolId = searchParams.get('pool_id')

  // ?completions=1&date=YYYY-MM-DD[&pool_id] — who ticked what, for the admin "done today" view
  if (searchParams.get('completions')) {
    const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })
    let q = supabaseAdmin
      .from('site_task_completions')
      .select('id, task_date, completed_at, pool_id, pools(name), staff(first_name, last_name), site_tasks(label, category, sort_order, photos_required)')
      .eq('task_date', date)
      .order('completed_at')
    if (poolId && poolId !== 'all') q = q.eq('pool_id', poolId)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Photo counts so the office can see the gym before/after shots were actually taken
    const ids = (data ?? []).map((r: any) => r.id)
    const counts = new Map<string, number>()
    if (ids.length) {
      const { data: photos } = await supabaseAdmin
        .from('attachments').select('entity_id').eq('entity_type', 'site_task_completion').in('entity_id', ids)
      for (const a of photos ?? []) counts.set(a.entity_id, (counts.get(a.entity_id) ?? 0) + 1)
    }
    return NextResponse.json({ date, completions: (data ?? []).map((r: any) => ({ ...r, photo_count: counts.get(r.id) ?? 0 })) })
  }

  let query = supabaseAdmin
    .from('site_tasks')
    .select('*, pools(name)')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at')
  // 'all' = only the global tasks; 'type:splash_pad' = that pool type's tasks; a pool id = that pool's own; nothing = everything
  if (poolId === 'all') query = query.is('pool_id', null).is('pool_type', null)
  else if (poolId?.startsWith('type:')) query = query.eq('pool_type', poolId.slice(5))
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
    .insert({ label, category: String(body.category ?? '').trim() || null, pool_id: body.pool_id || null, pool_type: body.pool_type || null, sort_order: body.sort_order ?? 0, photos_required: Math.max(0, Number(body.photos_required) || 0), created_by: user.id })
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

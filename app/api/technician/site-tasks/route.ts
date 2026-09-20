import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// GET  ?pool_id — the site's task list (global + pool-specific) with today's ticks
// POST { pool_id, task_id, done } — tick / untick a task for today

const todaySydney = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const poolId = new URL(req.url).searchParams.get('pool_id')
  if (!poolId) return NextResponse.json({ error: 'pool_id required' }, { status: 400 })
  const date = todaySydney()

  // All-sites tasks + tasks for this pool's type (e.g. splash_pad) + this pool's own tasks.
  // A 'facility' (gym etc.) has no water, so it gets only its own tasks — none of the pool ones.
  const { data: pool } = await supabaseAdmin.from('pools').select('pool_type').eq('id', poolId).single()
  const poolType = pool?.pool_type ?? ''
  const scope = poolType === 'facility'
    ? `pool_id.eq.${poolId}`
    : `and(pool_id.is.null,pool_type.is.null),pool_id.eq.${poolId}${poolType ? `,pool_type.eq.${poolType}` : ''}`
  const [{ data: tasks, error: tErr }, { data: done, error: dErr }] = await Promise.all([
    supabaseAdmin
      .from('site_tasks')
      .select('*')   // '*' so the list still loads if the photos_required migration hasn't been run yet
      .eq('is_active', true)
      .or(scope)
      .order('sort_order')
      .order('created_at'),
    supabaseAdmin
      .from('site_task_completions')
      .select('id, task_id, completed_at, staff(first_name)')
      .eq('pool_id', poolId)
      .eq('task_date', date),
  ])
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })

  // Photo counts for today's ticks, so the list can show "2 of 3 photos" (best effort)
  const completionIds = (done ?? []).map((d: any) => d.id)
  const photoCount = new Map<string, number>()
  if (completionIds.length) {
    try {
      const { data: photos } = await supabaseAdmin
        .from('attachments').select('entity_id').eq('entity_type', 'site_task_completion').in('entity_id', completionIds)
      for (const a of photos ?? []) photoCount.set(a.entity_id, (photoCount.get(a.entity_id) ?? 0) + 1)
    } catch { /* photos are optional */ }
  }

  const doneById = new Map((done ?? []).map((d: any) => [d.task_id, d]))
  return NextResponse.json({
    date,
    tasks: (tasks ?? []).map(t => {
      const c = doneById.get(t.id)
      return {
        ...t, photos_required: t.photos_required ?? 0,
        done: !!c, completion_id: c?.id ?? null, completed_at: c?.completed_at ?? null,
        completed_by: c?.staff?.first_name ?? null, photo_count: c ? (photoCount.get(c.id) ?? 0) : 0,
      }
    }),
  })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pool_id, task_id, done } = await req.json()
  if (!pool_id || !task_id) return NextResponse.json({ error: 'pool_id and task_id required' }, { status: 400 })
  const date = todaySydney()

  if (done) {
    const { data, error } = await supabaseAdmin
      .from('site_task_completions')
      .upsert({ task_id, pool_id, task_date: date, completed_by: user.id, completed_at: new Date().toISOString() }, { onConflict: 'task_id,pool_id,task_date' })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, completion_id: data.id })
  }
  const { error } = await supabaseAdmin
    .from('site_task_completions')
    .delete()
    .match({ task_id, pool_id, task_date: date })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

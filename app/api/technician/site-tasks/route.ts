import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// GET  ?pool_id — the site's task list (global + pool-specific) with today's ticks
// POST { pool_id, task_id, done } — tick / untick a task for today

const todaySydney = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const poolId = new URL(req.url).searchParams.get('pool_id')
  if (!poolId) return NextResponse.json({ error: 'pool_id required' }, { status: 400 })
  const date = todaySydney()

  const [{ data: tasks, error: tErr }, { data: done, error: dErr }] = await Promise.all([
    supabaseAdmin
      .from('site_tasks')
      .select('id, label, pool_id, sort_order')
      .eq('is_active', true)
      .or(`pool_id.is.null,pool_id.eq.${poolId}`)
      .order('sort_order')
      .order('created_at'),
    supabaseAdmin
      .from('site_task_completions')
      .select('task_id, completed_at, staff(first_name)')
      .eq('pool_id', poolId)
      .eq('task_date', date),
  ])
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })

  const doneById = new Map((done ?? []).map((d: any) => [d.task_id, d]))
  return NextResponse.json({
    date,
    tasks: (tasks ?? []).map(t => {
      const c = doneById.get(t.id)
      return { ...t, done: !!c, completed_at: c?.completed_at ?? null, completed_by: c?.staff?.first_name ?? null }
    }),
  })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pool_id, task_id, done } = await req.json()
  if (!pool_id || !task_id) return NextResponse.json({ error: 'pool_id and task_id required' }, { status: 400 })
  const date = todaySydney()

  const { error } = done
    ? await supabaseAdmin
        .from('site_task_completions')
        .upsert({ task_id, pool_id, task_date: date, completed_by: user.id, completed_at: new Date().toISOString() }, { onConflict: 'task_id,pool_id,task_date' })
    : await supabaseAdmin
        .from('site_task_completions')
        .delete()
        .match({ task_id, pool_id, task_date: date })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { canAccessPool } from '@/lib/org-scope'
import { todayLocal, localDayRange } from '@/lib/local-time'
import { isCleaningJobType } from '@/lib/cleaning-jobs'

// Before & After cleaning jobs at a site. A job is started (BEFORE photos), the work is done,
// then it is finished (AFTER photos). Photos are ordinary attachments:
// entity_type 'cleaning_before' / 'cleaning_after', entity_id = the job.

async function photoCounts(ids: string[]) {
  const counts = new Map<string, { before: number; after: number }>()
  if (!ids.length) return counts
  const { data } = await supabaseAdmin.from('attachments')
    .select('entity_id, entity_type').in('entity_type', ['cleaning_before', 'cleaning_after']).in('entity_id', ids)
  for (const a of data ?? []) {
    const c = counts.get(a.entity_id) ?? { before: 0, after: 0 }
    if (a.entity_type === 'cleaning_before') c.before++; else c.after++
    counts.set(a.entity_id, c)
  }
  return counts
}

// GET ?pool_id= — today's jobs at this site, everyone's, with how many photos each side has
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const poolId = new URL(req.url).searchParams.get('pool_id')
  if (!(await canAccessPool(user, poolId))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { start, end } = localDayRange(todayLocal())
  const { data, error } = await supabaseAdmin
    .from('cleaning_jobs')
    .select('*, staff:started_by(first_name)')
    .eq('pool_id', poolId).gte('started_at', start).lte('started_at', end)
    .order('started_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts = await photoCounts((data ?? []).map(j => j.id))
  return NextResponse.json({
    jobs: (data ?? []).map(j => ({ ...j, before_count: counts.get(j.id)?.before ?? 0, after_count: counts.get(j.id)?.after ?? 0 })),
  })
}

// POST { pool_id, shift_id?, job_type, job_label? } — start a job; BEFORE photos attach to it next
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!(await canAccessPool(user, body.pool_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isCleaningJobType(body.job_type)) return NextResponse.json({ error: 'Pick a job' }, { status: 400 })
  const label = String(body.job_label ?? '').trim()
  if (body.job_type === 'other' && !label) return NextResponse.json({ error: 'Say what you are cleaning' }, { status: 400 })

  const { data: pool } = await supabaseAdmin.from('pools').select('org_id').eq('id', body.pool_id).single()
  const { data, error } = await supabaseAdmin.from('cleaning_jobs').insert({
    pool_id: body.pool_id,
    org_id: pool?.org_id ?? null,
    shift_id: body.shift_id || null,
    job_type: body.job_type,
    job_label: body.job_type === 'other' ? label : null,
    started_by: user.id,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ job: { ...data, before_count: 0, after_count: 0 } })
}

// PATCH { id, action: 'finish' | 'reopen' } — finish needs at least one photo each side
export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action } = await req.json()
  const { data: job } = await supabaseAdmin.from('cleaning_jobs').select('id, pool_id').eq('id', id).single()
  if (!job || !(await canAccessPool(user, job.pool_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'finish') {
    const c = (await photoCounts([id])).get(id) ?? { before: 0, after: 0 }
    if (!c.before || !c.after) return NextResponse.json({ error: 'Add at least one BEFORE and one AFTER photo first.' }, { status: 400 })
  }
  const patch = action === 'finish'
    ? { status: 'done', finished_at: new Date().toISOString() }
    : { status: 'in_progress', finished_at: null }
  const { data, error } = await supabaseAdmin.from('cleaning_jobs').update(patch).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ job: data })
}

// DELETE ?id= — a job started by mistake; only while it has no photos, so nothing is orphaned
export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  const { data: job } = await supabaseAdmin.from('cleaning_jobs').select('id, pool_id').eq('id', id).single()
  if (!job || !(await canAccessPool(user, job.pool_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const c = (await photoCounts([job.id])).get(job.id)
  if (c && (c.before || c.after)) return NextResponse.json({ error: 'Delete the photos first.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('cleaning_jobs').delete().eq('id', job.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

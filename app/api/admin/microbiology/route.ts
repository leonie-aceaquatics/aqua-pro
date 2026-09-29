import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { visibleOrgIds, visiblePoolIds, canAccessPool } from '@/lib/org-scope'

// Microbiology test logging — genuinely different workflow to water_tests: a sample is taken
// on-site, sent to an external lab, and the result (pass/fail against a CFU threshold) arrives
// days later. GET/POST cover "log the sample," PATCH covers "record the result when it arrives."

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const poolId = searchParams.get('pool_id')
  const status = searchParams.get('pass_fail')

  let query = supabaseAdmin
    .from('microbiology_tests')
    .select('*, pools(name), staff(first_name, last_name)')
    .order('sample_taken_at', { ascending: false })
    .limit(200)

  query = query.in('pool_id', await visiblePoolIds(user))
  if (poolId) query = query.eq('pool_id', poolId)
  if (status) query = query.eq('pass_fail', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tests: data })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.pool_id || !body.test_type) {
    return NextResponse.json({ error: 'pool_id and test_type are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('microbiology_tests')
    .insert({
      pool_id: body.pool_id,
      sample_taken_by: user.id,
      sample_taken_at: body.sample_taken_at || new Date().toISOString(),
      test_type: body.test_type,
      lab_name: body.lab_name || null,
      lab_reference: body.lab_reference || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ test: data })
}

// Record the lab result once it arrives
export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (rest.result_value !== undefined) updates.result_value = rest.result_value === '' ? null : Number(rest.result_value)
  if (rest.result_unit !== undefined) updates.result_unit = rest.result_unit
  if (rest.pass_fail !== undefined) {
    updates.pass_fail = rest.pass_fail
    if (rest.pass_fail !== 'pending') updates.result_received_at = new Date().toISOString()
  }
  if (rest.lab_reference !== undefined) updates.lab_reference = rest.lab_reference || null
  if (rest.notes !== undefined) updates.notes = rest.notes || null

  const { data, error } = await supabaseAdmin
    .from('microbiology_tests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // A failed micro result is a real closure-relevant event — notify admin/manager staff the same
  // way a red water_test risk level already does elsewhere in this app.
  if (rest.pass_fail === 'fail') {
    const { data: staffList } = await supabaseAdmin.from('staff').select('id').in('role', ['admin', 'manager']).eq('is_active', true)
    if (staffList?.length) {
      await supabaseAdmin.from('notifications').insert(
        staffList.map(s => ({
          recipient_id: s.id,
          pool_id: data.pool_id,
          type: 'microbiology_fail',
          title: 'Microbiology test failed',
          body: `${data.test_type.replace(/_/g, ' ')} result came back FAIL — review immediately.`,
        }))
      )
    }
  }

  return NextResponse.json({ test: data })
}

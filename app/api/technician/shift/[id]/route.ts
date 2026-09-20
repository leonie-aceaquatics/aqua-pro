import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { sendSiteVisitReport } from '@/lib/site-visit-report'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .update(body)
    .eq('id', id)
    .eq('staff_id', user.id)  // technician can only update their own shifts
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Finish shift → the office gets the full visit report (tasks, tests, stock, plant log, hours)
  if (body.status === 'completed') {
    after(() => sendSiteVisitReport(id).catch(e => console.error('Site visit report failed:', e)))
  }
  return NextResponse.json({ shift: data })
}

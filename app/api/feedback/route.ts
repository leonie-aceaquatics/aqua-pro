import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { diagnoseFeedback } from '@/lib/ai'
import { sendStaffFeedbackEmail } from '@/lib/email'
import { FEEDBACK_BUCKET, signStoredFile } from '@/lib/attachment-storage'

export async function GET() {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('staff_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Screenshots live in a private bucket — hand back a signed link, not a path.
  const feedback = await Promise.all((data ?? []).map(async (f: any) => (
    f.screenshot_url ? { ...f, screenshot_url: await signStoredFile(FEEDBACK_BUCKET, f.screenshot_url) } : f
  )))
  return NextResponse.json({ feedback })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const type = body.type || 'bug'
  const title = (body.title || '').trim()
  const description = body.description || ''
  const priority = body.priority || 'medium'
  const pageUrl = body.page_url || null
  const screenshotUrl = body.screenshot_url || null

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const { data: row, error } = await supabaseAdmin
    .from('staff_feedback')
    .insert({
      type, title, description, priority,
      page_url: pageUrl, screenshot_url: screenshotUrl,
      submitted_by: `${user.firstName} ${user.lastName}`,
      submitted_by_email: user.email,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const diagnosis = await diagnoseFeedback(type, title, description, pageUrl)

  if (diagnosis) {
    await supabaseAdmin
      .from('staff_feedback')
      .update({
        ai_diagnosis: diagnosis.root_cause,
        ai_workaround: diagnosis.workaround,
        ai_fix_hint: diagnosis.fix_approach,
      })
      .eq('id', row.id)
  }

  const { data: admins } = await supabaseAdmin
    .from('staff')
    .select('email')
    .in('role', ['admin', 'manager'])
    .eq('is_active', true)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  void sendStaffFeedbackEmail(
    admins?.map(a => a.email) ?? [],
    type, title, priority, `${user.firstName} ${user.lastName}`,
    description, pageUrl, diagnosis?.workaround ?? null, `${appUrl}/admin`
  )

  return NextResponse.json({ feedback: row, diagnosis })
}

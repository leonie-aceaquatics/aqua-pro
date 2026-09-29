import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { sendStaffFeedbackDoneEmail } from '@/lib/email'
import { FEEDBACK_BUCKET, signStoredFile } from '@/lib/attachment-storage'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession()
  if (!user || !['admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status } = await req.json()
  if (!['pending', 'in_progress', 'done'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('staff_feedback')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'done' && data.submitted_by_email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    void sendStaffFeedbackDoneEmail(data.submitted_by_email, data.title, `${appUrl}/admin`)
  }

  // Same as the list: the screenshot path is signed before it goes back to the browser.
  return NextResponse.json({
    feedback: data.screenshot_url
      ? { ...data, screenshot_url: await signStoredFile(FEEDBACK_BUCKET, data.screenshot_url) }
      : data,
  })
}

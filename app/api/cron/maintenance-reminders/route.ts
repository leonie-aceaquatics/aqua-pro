import { NextRequest, NextResponse } from 'next/server'
import { localDayRange } from '@/lib/local-time'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail, buildShiftReminderEmail } from '@/lib/email'

// Runs daily — sends shift reminder emails to technicians/contractors for tomorrow's shifts

export async function GET(req: NextRequest) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tz = 'Australia/Sydney'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDate = tomorrow.toLocaleDateString('en-CA', { timeZone: tz })
  const { start, end } = localDayRange(tomorrowDate)

  const { data: shifts } = await supabaseAdmin
    .from('shifts')
    .select('*, staff(first_name, last_name, email), pools(name)')
    .gte('scheduled_start', start)
    .lte('scheduled_start', end)
    .in('status', ['scheduled'])

  let sent = 0
  for (const shift of shifts ?? []) {
    if (!shift.staff?.email) continue

    const html = buildShiftReminderEmail(
      shift.staff.first_name,
      shift.pools?.name ?? 'Office / Admin',
      new Date(shift.scheduled_start).toLocaleString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit', timeZone: tz,
      }),
      shift.shift_type.replace('_', ' ')
    )

    try {
      await sendEmail(
        shift.staff.email,
        `Shift Reminder: ${shift.pools?.name ?? 'Admin'} — ${new Date(shift.scheduled_start).toLocaleDateString('en-AU', { timeZone: tz })}`,
        html
      )
      sent++
    } catch {}
  }

  return NextResponse.json({ ok: true, shiftsFound: shifts?.length ?? 0, remindersSent: sent })
}

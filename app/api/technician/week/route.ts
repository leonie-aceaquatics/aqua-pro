import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { todayLocal, localDayRange } from '@/lib/local-time'

// GET — this technician's shifts for the next 7 days after today (the week ahead)
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = todayLocal()
  const from = localDayRange(today).end
  const last = new Date(`${today}T12:00:00`); last.setDate(last.getDate() + 7)
  const to = localDayRange(last.toISOString().slice(0, 10)).end

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .select('id, pool_id, shift_type, scheduled_start, scheduled_end, status, notes, pools(name, suburb)')
    .eq('staff_id', user.id)
    .gt('scheduled_start', from)
    .lte('scheduled_start', to)
    .neq('status', 'cancelled')
    .order('scheduled_start')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shifts: data })
}

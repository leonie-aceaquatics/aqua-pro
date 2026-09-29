import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendDailyWaterSummary } from '@/lib/daily-summary'

// Close of business. One summary per organisation on "exceptions" mode, so an owner with four
// rounds a day gets a single readable record instead of a dozen separate emails.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: orgs } = await supabaseAdmin
    .from('organisations').select('id, name')
    .eq('results_email_mode', 'exceptions').eq('is_active', true).not('results_email', 'is', null)

  const sent: string[] = []
  for (const o of orgs ?? []) {
    try { if (await sendDailyWaterSummary(o.id)) sent.push(o.name) }
    catch (e) { console.error(`Daily summary for ${o.name} failed:`, e) }
  }
  return NextResponse.json({ ok: true, sent })
}

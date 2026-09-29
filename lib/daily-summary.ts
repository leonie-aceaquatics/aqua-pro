import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail, RESULTS_EMAIL, emailBase } from '@/lib/email'
import { localDayRange, todayLocal } from '@/lib/local-time'

// One email at close of business for an organisation on "exceptions" mode: what was recorded
// today, what was missed, and whether every dose got its retest. The owner reads one of these
// instead of eighty-five individual results a week.

const TZ = 'Australia/Melbourne'
const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-AU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })

export async function sendDailyWaterSummary(orgId: string, day = todayLocal()): Promise<boolean> {
  const { data: org } = await supabaseAdmin
    .from('organisations').select('name, results_email, results_email_mode').eq('id', orgId).single()
  if (!org?.results_email) return false

  const { start, end } = localDayRange(day)
  const { data: pools } = await supabaseAdmin
    .from('pools').select('id, name').eq('org_id', orgId).eq('is_active', true).order('name')
  if (!pools?.length) return false

  const poolIds = pools.map(p => p.id)
  const [{ data: tests }, { data: rounds }] = await Promise.all([
    supabaseAdmin.from('water_tests')
      .select('id, pool_id, tested_at, round_key, is_retest, retest_of, free_chlorine, ph, combined_chlorine, risk_level, risk_flags, staff:tested_by(first_name)')
      .in('pool_id', poolIds).gte('tested_at', start).lte('tested_at', end).order('tested_at'),
    supabaseAdmin.from('pool_rounds').select('pool_id, round_key, label, sort_order').in('pool_id', poolIds).order('sort_order'),
  ])

  const all = tests ?? []
  const riskColour = (r: string) => r === 'red' ? '#d63031' : r === 'orange' ? '#e17055' : r === 'yellow' ? '#fdcb6e' : '#00b894'

  // Per body of water: which rounds were recorded, which were not, and any dose without a retest
  const blocks = pools.map(p => {
    const mine = all.filter(t => t.pool_id === p.id)
    const poolRounds = (rounds ?? []).filter(r => r.pool_id === p.id)
    const missed = poolRounds.filter(r => !mine.some(t => t.round_key === r.round_key && !t.is_retest))

    const rows = mine.map(t => `<tr>
      <td style="padding:5px 10px 5px 0;color:#94a3b8;font-size:13px;white-space:nowrap">${time(t.tested_at)}${t.is_retest ? ' <span style="color:#00b894">retest</span>' : ''}</td>
      <td style="padding:5px 10px 5px 0;color:#cbd5e1;font-size:13px">FC ${t.free_chlorine ?? '—'} · pH ${t.ph ?? '—'} · Comb ${t.combined_chlorine ?? '—'}</td>
      <td style="padding:5px 0;text-align:right;font-size:12px;font-weight:700;color:${riskColour(t.risk_level)}">${esc(t.risk_level ?? '')}</td>
    </tr>`).join('')

    return `<div style="background:#0f1e35;border:1px solid ${missed.length ? '#e1705560' : '#1a2d45'};border-radius:10px;padding:14px 16px;margin-bottom:10px">
      <div style="color:#e2e8f0;font-weight:700;font-size:15px;margin-bottom:6px">${esc(p.name)}</div>
      ${mine.length ? `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>` : '<div style="color:#64748b;font-size:13px">Nothing recorded today.</div>'}
      ${missed.length ? `<div style="margin-top:8px;color:#e17055;font-size:13px;font-weight:700">Not recorded: ${missed.map(m => esc(m.label)).join(', ')}</div>` : ''}
    </div>`
  }).join('')

  const exceptions = all.filter(t => t.risk_level === 'red' || t.risk_level === 'orange')
  const dayLabel = new Date(`${day}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const html = emailBase(`
    <h2 style="margin:0 0 4px;color:#ffffff">Water record — ${esc(org.name)}</h2>
    <div style="color:#64748b;font-size:13px;margin-bottom:16px">${dayLabel}</div>
    ${exceptions.length
      ? `<div style="background:#d6303122;border:1px solid #d63031;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#ff7675;font-weight:700">
          ${exceptions.length} reading${exceptions.length === 1 ? '' : 's'} out of range today — see below</div>`
      : `<div style="background:#00b89418;border:1px solid #00b89440;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#00b894;font-weight:700">
          All readings in range today</div>`}
    ${blocks}
    <div style="color:#64748b;font-size:12px;margin-top:14px;line-height:1.6">
      Keep the printed sheets in the folder as well — under regulation 61 the record has to be at the premises.
    </div>
    <a href="${appUrl}/client" style="display:inline-block;margin-top:16px;background:#00b4d8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Open AquaPro</a>
  `)

  const subject = `${exceptions.length ? '⚠️ ' : ''}Water record: ${org.name} — ${dayLabel}`
  // The client gets their summary; Ace gets a copy as the service provider.
  for (const address of new Set([org.results_email, RESULTS_EMAIL])) {
    try { await sendEmail(address, subject, html) } catch (e) { console.error(`Daily summary to ${address} failed:`, e) }
  }
  return true
}

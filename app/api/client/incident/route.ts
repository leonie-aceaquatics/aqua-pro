import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { canAccessPool } from '@/lib/org-scope'
import { sendEmail, RESULTS_EMAIL } from '@/lib/email'

// A client reporting an incident at their own body of water — contamination, a fault, anything
// that needs the office to know. Ace is told immediately regardless of the organisation's email
// setting: a contamination event is not something to hold back for the nightly summary.
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!(await canAccessPool(user, body.pool_id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('incidents')
    .insert({
      pool_id: body.pool_id,
      reported_by: user.id,
      incident_type: body.incident_type ?? 'water_quality',
      severity: body.severity ?? 'high',
      description: String(body.description ?? '').slice(0, 20000),
      immediate_action: body.immediate_action ?? null,
      occurred_at: body.occurred_at ?? new Date().toISOString(),
    })
    .select('*, pools(name, org_id)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const poolName = (Array.isArray(data.pools) ? data.pools[0]?.name : (data.pools as any)?.name) ?? 'a body of water'
  const who = `${user.firstName} ${user.lastName}`.trim()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Both the service provider and the client's own inbox — this one always goes out.
  const { data: org } = await supabaseAdmin
    .from('organisations').select('results_email').eq('id', user.orgId).single()

  const html = `<div style="font-family:Arial,sans-serif;background:#0a1628;padding:24px;color:#e2e8f0">
    <h2 style="color:#ff7675;margin:0 0 4px">Incident reported — ${poolName}</h2>
    <div style="color:#64748b;font-size:13px;margin-bottom:16px">${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })} · ${who} · ${user.orgName}</div>
    <pre style="white-space:pre-wrap;font-family:inherit;background:#0f1e35;border-radius:8px;padding:16px;font-size:13px;line-height:1.6;color:#cbd5e1">${String(body.description ?? '').replace(/</g, '&lt;')}</pre>
    <a href="${appUrl}/admin" style="display:inline-block;margin-top:16px;background:#00b4d8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Open in AquaPro</a>
  </div>`

  for (const address of new Set([RESULTS_EMAIL, org?.results_email].filter(Boolean) as string[])) {
    try { await sendEmail(address, `🚨 Incident: ${poolName}`, html) } catch (e) { console.error(`Incident email to ${address} failed:`, e) }
  }

  return NextResponse.json({ incident: data })
}

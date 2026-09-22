import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail, RESULTS_EMAIL, emailBase } from '@/lib/email'
import { fmtTime, fmtDuration } from '@/lib/shift-time'
import { localDayRange } from '@/lib/local-time'

// One email per finished shift: everything the technician did at that site today —
// hours on site, every task ticked (and not ticked) with photo counts, water tests,
// chemicals added, stock count and plant room log. Sent to the office inbox.

const TZ = 'Australia/Melbourne'
const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })
const yesNo = (v: any) => v === true ? 'Yes' : v === false ? 'No' : null
const nice = (v: any) => v == null ? null : String(v).replace(/_/g, ' ')

const PLANT_FIELDS: [string, string, (v: any) => string | null][] = [
  ['water_clarity', 'Water clarity', nice],
  ['pool_floor_checked', 'Pool floor checked', yesNo],
  ['backwash_done', 'Backwash', yesNo],
  ['backwash_minutes', 'Backwash ran for', v => v == null ? null : `${v} min`],
  ['lint_baskets_done', 'Lint baskets', yesNo],
  ['sample_line_filter_done', 'Sample line filter', yesNo],
  ['auto_vac_done', 'Auto-vac', yesNo],
  ['dosing_done', 'Dosing', yesNo],
  ['controller_status_ok', 'Controller status OK', yesNo],
  ['co2_controller', 'CO2 controller', nice],
  ['gas_detector_co2', 'Gas detector (CO2)', nice],
  ['dulcomarin_alarm', 'Dulcomarin alarm', yesNo],
  ['mechmate_alarm', 'MechMate alarm', yesNo],
  ['cp1_status', 'Circulation pump 1', nice],
  ['cp1_pressure_psi', 'CP1 pressure (psi)', v => v == null ? null : String(v)],
  ['cp2_status', 'Circulation pump 2', nice],
  ['cp2_pressure_psi', 'CP2 pressure (psi)', v => v == null ? null : String(v)],
  ['heat_pump_status', 'Heat pump', nice],
  ['filter_1_pressure_psi', 'Filter 1 pressure (psi)', v => v == null ? null : String(v)],
  ['filter_2_pressure_psi', 'Filter 2 pressure (psi)', v => v == null ? null : String(v)],
  ['chlorine_dosing_pump', 'Chlorine dosing pump', nice],
  ['acid_dosing_pump', 'Acid dosing pump', nice],
  ['general_leaks', 'Leaks', yesNo],
  ['general_leaks_notes', 'Leak notes', v => v || null],
  ['calibrate_fcl', 'Calibrate FCL', yesNo],
  ['calibrate_tcl', 'Calibrate TCL', yesNo],
  ['calibrate_ph', 'Calibrate pH', yesNo],
  ['notes', 'Notes', v => v || null],
]

const TEST_FIELDS: [string, string, string][] = [
  ['free_chlorine', 'Free Cl', 'ppm'], ['total_chlorine', 'Total Cl', 'ppm'], ['combined_chlorine', 'Combined Cl', 'ppm'],
  ['ph', 'pH', ''], ['total_alkalinity', 'TA', 'ppm'], ['calcium_hardness', 'CH', 'ppm'], ['cyanuric_acid', 'CYA', 'ppm'],
  ['salt_level', 'Salt', 'ppm'], ['temperature_c', 'Temp', '°C'], ['turbidity', 'Turbidity', 'NTU'],
  ['langelier_saturation_index', 'LSI', ''], ['uv_output_pct', 'UV output', '%'], ['uv_run_hours', 'UV hours', 'h'], ['balance_tank_pct', 'Balance tank', '% full'],
]

const h = (t: string) => `<h3 style="margin:24px 0 8px;color:#00b4d8;font-size:14px;text-transform:uppercase;letter-spacing:0.5px">${t}</h3>`
const box = (inner: string, colour = '#1a2d45') => `<div style="background:${colour};border-radius:8px;padding:12px 16px;margin-bottom:8px;font-size:14px;color:#e2e8f0">${inner}</div>`
const muted = (t: string) => `<div style="color:#64748b;font-size:13px">${t}</div>`

export async function sendSiteVisitReport(shiftId: string) {
  const { data: shift } = await supabaseAdmin
    .from('shifts')
    .select('*, staff(first_name, last_name), pools(id, name, pool_type, site_code)')
    .eq('id', shiftId).single()
  if (!shift || !shift.pool_id) return

  const pool = shift.pools
  const tech = shift.staff ? `${shift.staff.first_name} ${shift.staff.last_name}` : 'Unknown'
  const day = dayOf(shift.actual_end ?? shift.actual_start ?? shift.scheduled_start)
  const { start: dayStart, end: dayEnd } = localDayRange(day)

  // Task list for this site (same scope rule as the technician app) + today's ticks + photo counts
  const scope = pool.pool_type === 'facility'
    ? `pool_id.eq.${pool.id}`
    : `and(pool_id.is.null,pool_type.is.null),pool_id.eq.${pool.id}${pool.pool_type ? `,pool_type.eq.${pool.pool_type}` : ''}`
  const [{ data: tasks }, { data: ticks }, { data: tests }, { data: stock }, { data: plantLogs }] = await Promise.all([
    supabaseAdmin.from('site_tasks').select('id, label, category, sort_order, photos_required').eq('is_active', true).or(scope).order('sort_order'),
    supabaseAdmin.from('site_task_completions').select('id, task_id, completed_at, staff(first_name)').eq('pool_id', pool.id).eq('task_date', day),
    supabaseAdmin.from('water_tests').select('*, staff:tested_by(first_name)').eq('pool_id', pool.id).gte('tested_at', dayStart).lte('tested_at', dayEnd).order('tested_at'),
    supabaseAdmin.from('site_chemical_stock').select('quantity, last_counted_at, chemicals(name, unit), staff:last_counted_by(first_name)').eq('pool_id', pool.id).gte('last_counted_at', dayStart).lte('last_counted_at', dayEnd),
    supabaseAdmin.from('plant_logs').select('*, staff:logged_by(first_name)').eq('pool_id', pool.id).gte('logged_at', dayStart).lte('logged_at', dayEnd).order('logged_at'),
  ])

  const tickById = new Map((ticks ?? []).map((t: any) => [t.task_id, t]))
  const tickIds = (ticks ?? []).map((t: any) => t.id)
  const photoCount = new Map<string, number>()
  if (tickIds.length) {
    const { data: photos } = await supabaseAdmin.from('attachments').select('entity_id').eq('entity_type', 'site_task_completion').in('entity_id', tickIds)
    for (const p of photos ?? []) photoCount.set(p.entity_id, (photoCount.get(p.entity_id) ?? 0) + 1)
  }
  // Chemicals added today at this site
  const { data: dosesToday } = await supabaseAdmin
    .from('chemical_usage_log').select('quantity, applied_at, chemicals(name, dose_unit, unit)')
    .eq('pool_id', pool.id).gte('applied_at', dayStart).lte('applied_at', dayEnd)

  // ── Build the email ──────────────────────────────────────────────────────
  const done = (tasks ?? []).filter((t: any) => tickById.has(t.id))
  const notDone = (tasks ?? []).filter((t: any) => !tickById.has(t.id))
  const taskRow = (t: any) => {
    const c = tickById.get(t.id)
    const photos = c ? (photoCount.get(c.id) ?? 0) : 0
    const short = t.photos_required > 0 && photos < t.photos_required
    return `<div style="padding:6px 0;border-bottom:1px solid #1a2d45;font-size:13px;color:#e2e8f0">
      <span style="color:${c ? '#00b894' : '#d63031'};font-weight:700">${c ? '✓' : '✗'}</span> ${esc(t.label)}
      ${c ? `<span style="color:#64748b"> — ${esc(c.staff?.first_name ?? '')} ${fmtTime(c.completed_at)}</span>` : ''}
      ${t.photos_required > 0 ? `<span style="color:${short ? '#e17055' : '#00b894'}"> · 📷 ${photos}/${t.photos_required}</span>` : ''}
    </div>`
  }

  const hours = shift.actual_start && shift.actual_end ? fmtDuration(shift.actual_start, shift.actual_end) : null
  const timeBlock = box(`
    <div style="display:flex;gap:24px;flex-wrap:wrap">
      <div><span style="color:#64748b;font-size:12px;display:block">Started</span><strong>${shift.actual_start ? fmtTime(shift.actual_start) : '—'}</strong></div>
      <div><span style="color:#64748b;font-size:12px;display:block">Finished</span><strong>${shift.actual_end ? fmtTime(shift.actual_end) : '—'}</strong></div>
      <div><span style="color:#64748b;font-size:12px;display:block">On site</span><strong style="color:#00b4d8">${hours ?? '—'}</strong></div>
      <div><span style="color:#64748b;font-size:12px;display:block">Rostered</span>${fmtTime(shift.scheduled_start)}${shift.scheduled_end ? ' – ' + fmtTime(shift.scheduled_end) : ''}</div>
    </div>
    ${shift.notes ? `<div style="margin-top:8px;color:#94a3b8;font-size:13px">Job note: ${esc(shift.notes)}</div>` : ''}`)

  const tasksBlock = (tasks ?? []).length === 0 ? muted('No task list for this site.') : `
    ${muted(`${done.length} of ${(tasks ?? []).length} tasks ticked`)}
    ${done.map(taskRow).join('')}
    ${notDone.length ? `<div style="margin-top:10px;color:#e17055;font-weight:700;font-size:12px">NOT DONE</div>${notDone.map(taskRow).join('')}` : ''}`

  const riskColour = (r: string) => r === 'red' ? '#d63031' : r === 'orange' ? '#e17055' : r === 'yellow' ? '#fdcb6e' : '#00b894'
  const testsBlock = (tests ?? []).length === 0 ? muted('No water test logged today.') : (tests ?? []).map((t: any) => box(`
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px">
      <strong>${fmtTime(t.tested_at)} · ${esc(t.staff?.first_name ?? '')}</strong>
      <span style="color:${riskColour(t.risk_level)};font-weight:700;text-transform:uppercase;font-size:12px">${esc(t.risk_level ?? '')}${(t.risk_flags ?? []).length ? ' · ' + esc((t.risk_flags as string[]).join(', ')) : ''}</span>
    </div>
    <div style="color:#cbd5e1;font-size:13px;line-height:1.7">
      ${TEST_FIELDS.filter(([k]) => t[k] != null).map(([k, l, u]) => `${l} <strong style="color:#e2e8f0">${Number(t[k])}${u ? ' ' + u : ''}</strong>`).join(' &nbsp;·&nbsp; ')}
    </div>
    ${t.controller_ph != null || t.controller_fcl != null ? `<div style="color:#94a3b8;font-size:12px;margin-top:4px">System screen: ${t.controller_ph != null ? `pH ${t.controller_ph}${t.calibrate_ph ? ' (calibrated)' : ''}` : ''} ${t.controller_fcl != null ? `Free Cl ${t.controller_fcl}${t.calibrate_fcl ? ' (calibrated)' : ''}` : ''}</div>` : ''}
    ${t.fault_report ? `<div style="margin-top:6px;color:#ff7675;font-size:13px"><strong>FAULT:</strong> ${esc(t.fault_report)}</div>` : ''}
    ${t.notes ? `<div style="margin-top:6px;color:#94a3b8;font-size:13px">${esc(t.notes)}</div>` : ''}`)).join('')

  const dosesBlock = (dosesToday ?? []).length === 0 ? muted('No chemicals added by hand.') :
    box((dosesToday ?? []).map((d: any) => `<div>${Number(d.quantity)} ${esc(d.chemicals?.dose_unit ?? d.chemicals?.unit ?? '')} ${esc(d.chemicals?.name ?? '')} <span style="color:#64748b">${fmtTime(d.applied_at)}</span></div>`).join(''))

  const stockRows: any[] = stock ?? []
  const stockBlock = stockRows.length === 0 ? muted('No stock count today.') :
    box(`<table cellpadding="0" cellspacing="0" style="font-size:13px;color:#e2e8f0">${stockRows.map((r: any) =>
      `<tr><td style="padding:3px 16px 3px 0">${esc(r.chemicals?.name ?? '')}</td><td style="padding:3px 0;text-align:right"><strong>${Number(r.quantity)}</strong> ${esc(r.chemicals?.unit ?? '')}</td></tr>`).join('')}</table>
      ${muted(`Counted by ${esc(stockRows[0]?.staff?.first_name ?? '')} ${fmtTime(stockRows[0]?.last_counted_at)}`)}`)

  const plantBlock = (plantLogs ?? []).length === 0 ? muted('No plant room log today.') : (plantLogs ?? []).map((l: any) => box(`
    <div style="margin-bottom:6px"><strong>${fmtTime(l.logged_at)} · ${esc(l.staff?.first_name ?? '')}</strong></div>
    <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#e2e8f0">${PLANT_FIELDS.map(([k, label, fmt]) => {
      const v = fmt(l[k]); if (v == null) return ''
      const bad = (k.endsWith('_alarm') && l[k] === true) || (k === 'general_leaks' && l[k] === true) || v === 'fault' || v === 'alarm' || v === 'concern'
      return `<tr><td style="padding:2px 16px 2px 0;color:#94a3b8">${label}</td><td style="padding:2px 0;color:${bad ? '#ff7675' : '#e2e8f0'};font-weight:${bad ? '700' : '400'}">${esc(v)}</td></tr>`
    }).join('')}</table>`)).join('')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const dateLabel = new Date(`${day}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const html = emailBase(`
    <h2 style="margin:0 0 4px;color:#ffffff">Site visit — ${esc(pool.name)}</h2>
    <div style="color:#64748b;font-size:13px;margin-bottom:16px">${dateLabel} · ${esc(tech)}</div>
    ${timeBlock}
    ${h('Site tasks')}${tasksBlock}
    ${h('Water tests')}${testsBlock}
    ${h('Chemicals added')}${dosesBlock}
    ${h('Stock count')}${stockBlock}
    ${h('Plant room log')}${plantBlock}
    <a href="${appUrl}/admin" style="display:inline-block;margin-top:20px;background:#00b4d8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Open in AquaPro</a>
  `)

  const alarm = (tests ?? []).some((t: any) => t.risk_level === 'red' || t.risk_level === 'orange') || notDone.length > 0
  await sendEmail(RESULTS_EMAIL, `${alarm ? '⚠️ ' : ''}Site visit: ${pool.name} — ${tech} — ${done.length}/${(tasks ?? []).length} tasks${hours ? ` — ${hours}` : ''}`, html)
}

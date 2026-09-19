// Helpers for showing rostered vs actual shift times. Melbourne local time throughout.
const TZ = 'Australia/Melbourne'

export function fmtTime(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-AU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

// Whole hours + minutes between two timestamps, e.g. "1h 28m"; open-ended = up to now
export function fmtDuration(startIso?: string | null, endIso?: string | null): string {
  if (!startIso) return ''
  const ms = (endIso ? new Date(endIso) : new Date()).getTime() - new Date(startIso).getTime()
  if (!isFinite(ms) || ms < 0) return ''
  const mins = Math.round(ms / 60000)
  const h = Math.floor(mins / 60), m = mins % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

export function hoursBetween(startIso?: string | null, endIso?: string | null): number {
  if (!startIso || !endIso) return 0
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  return ms > 0 ? ms / 3600000 : 0
}

// "08:12 – 09:40 (1h 28m)" | "Started 08:12 · 1h 5m so far" | ""
export function fmtActual(shift: { actual_start?: string | null; actual_end?: string | null }): string {
  if (!shift.actual_start) return ''
  if (!shift.actual_end) return `Started ${fmtTime(shift.actual_start)} · ${fmtDuration(shift.actual_start)} so far`
  return `${fmtTime(shift.actual_start)} – ${fmtTime(shift.actual_end)} (${fmtDuration(shift.actual_start, shift.actual_end)})`
}

// Helpers for <input type="datetime-local">, whose value is a zone-less wall-clock string
// ("2026-09-18T01:12"). All entry and display in AquaPro is in Melbourne time, whatever
// device the user is on — Date.toISOString() is UTC and the device zone can't be trusted
// (an iPad set to the wrong zone would otherwise log tests hours out).

export const APP_TZ = 'Australia/Melbourne'

const pad = (n: number) => String(n).padStart(2, '0')

// Wall-clock parts of an instant in APP_TZ
function zonedParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0)
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute'), s: get('second') }
}

// Offset (ms) of APP_TZ from UTC at a given instant — handles daylight saving
function tzOffsetMs(ts: number): number {
  const p = zonedParts(new Date(ts))
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - ts
}

// ISO timestamp (or now) → "YYYY-MM-DDTHH:mm" in Melbourne time, for the input's value
export function toLocalInput(iso?: string | Date | null): string {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return ''
  const p = zonedParts(d)
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`
}

// "YYYY-MM-DDTHH:mm" from the input, read as Melbourne time → UTC ISO string for the API
export function localInputToISO(value: string): string {
  if (!value) return value
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return value
  const [, y, mo, d, h, mi] = m.map(Number)
  const asUTC = Date.UTC(y, mo - 1, d, h, mi)
  // First guess using the offset at that wall-clock-as-UTC instant, then re-check so a
  // time entered right at a DST changeover still resolves to the right offset
  let ts = asUTC - tzOffsetMs(asUTC)
  ts = asUTC - tzOffsetMs(ts)
  return new Date(ts).toISOString()
}

// Today's date in Melbourne as "YYYY-MM-DD"
export function todayLocal(): string {
  const p = zonedParts(new Date())
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}`
}

// The UTC instants that bound a Melbourne calendar day, for timestamptz range queries.
// Never build these as "YYYY-MM-DDT00:00:00" — Postgres reads that as UTC, which is 10–11
// hours out and puts a 4:30 am Monday shift on Sunday's list.
export function localDayRange(day: string): { start: string; end: string } {
  return { start: localInputToISO(`${day}T00:00`), end: localInputToISO(`${day}T23:59`).replace(':00.000Z', ':59.999Z') }
}

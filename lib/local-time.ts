// Helpers for <input type="datetime-local">, whose value is a *local* wall-clock string
// ("2026-09-18T01:12", no zone). Date.toISOString() is UTC, so using it directly shifts
// the shown/stored time by the user's offset (+10h in Sydney) — these keep both directions local.

const pad = (n: number) => String(n).padStart(2, '0')

// ISO timestamp (or now) → "YYYY-MM-DDTHH:mm" in the browser's local zone, for the input's value
export function toLocalInput(iso?: string | Date | null): string {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// "YYYY-MM-DDTHH:mm" from the input → UTC ISO string for the API. Browsers parse a
// zone-less datetime string as local time, so new Date() does the conversion.
export function localInputToISO(value: string): string {
  if (!value) return value
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toISOString()
}

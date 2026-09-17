import { describe, it, expect } from 'vitest'
import { toLocalInput, localInputToISO } from './local-time'

describe('local-time', () => {
  it('round-trips a local wall-clock time through ISO', () => {
    const local = '2026-09-18T01:12'
    expect(toLocalInput(localInputToISO(local))).toBe(local)
  })

  it('formats now as a zone-less local string', () => {
    expect(toLocalInput()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('converts local input to an ISO string with the right offset', () => {
    const iso = localInputToISO('2026-09-18T01:12')
    const d = new Date(iso)
    expect(d.getHours()).toBe(1)
    expect(d.getMinutes()).toBe(12)
  })

  it('passes empty / invalid values through', () => {
    expect(localInputToISO('')).toBe('')
    expect(toLocalInput('not a date')).toBe('')
    expect(toLocalInput(null)).toMatch(/^\d{4}-/)
  })
})

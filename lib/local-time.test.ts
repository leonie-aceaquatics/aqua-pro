import { describe, it, expect } from 'vitest'
import { toLocalInput, localInputToISO } from './local-time'

describe('local-time (Australia/Melbourne)', () => {
  it('formats a UTC instant as Melbourne wall-clock time', () => {
    // 17 Sep 15:19 UTC = 18 Sep 01:19 AEST (+10, no DST in September)
    expect(toLocalInput('2026-09-17T15:19:00.000Z')).toBe('2026-09-18T01:19')
  })

  it('reads the input as Melbourne time when converting to ISO', () => {
    expect(localInputToISO('2026-09-18T01:19')).toBe('2026-09-17T15:19:00.000Z')
  })

  it('uses +11 during daylight saving', () => {
    // Melbourne DST: first Sunday in October → first Sunday in April
    expect(localInputToISO('2026-12-01T09:00')).toBe('2026-11-30T22:00:00.000Z')
    expect(toLocalInput('2026-11-30T22:00:00.000Z')).toBe('2026-12-01T09:00')
  })

  it('round-trips', () => {
    for (const v of ['2026-09-18T01:12', '2026-01-15T14:30', '2026-04-05T02:30']) {
      expect(toLocalInput(localInputToISO(v))).toBe(v)
    }
  })

  it('formats now as a zone-less string', () => {
    expect(toLocalInput()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('passes empty / invalid values through', () => {
    expect(localInputToISO('')).toBe('')
    expect(localInputToISO('garbage')).toBe('garbage')
    expect(toLocalInput('not a date')).toBe('')
  })
})

import { describe, it, expect } from 'vitest'
import { bathStatus, closureReasons } from './bath-status'

// Senza's targets, from the log book's one-line table.
const TARGETS = [
  { parameter: 'freeChlorine',     min_value: 2, max_value: 5,  ideal_value: 3,  close_below: 1,  close_above: null },
  { parameter: 'totalChlorine',    min_value: null, max_value: 6, ideal_value: null, close_below: null, close_above: 10 },
  { parameter: 'combinedChlorine', min_value: null, max_value: 0.5, ideal_value: 0, close_below: null, close_above: 1 },
  { parameter: 'ph',               min_value: 7.3, max_value: 7.6, ideal_value: 7.45, close_below: 7, close_above: 8 },
]
const ROUNDS = [
  { round_key: 'pre_open', label: 'Pre-open', scheduled_at: '08:45', is_gate: true,  sort_order: 10 },
  { round_key: 'round_2',  label: 'Round 2',  scheduled_at: '12:45', is_gate: false, sort_order: 20 },
]
const at = (hhmm: string) => new Date(`2026-10-02T${hhmm}:00+10:00`).toISOString()
const noon = new Date('2026-10-02T12:00:00+10:00')

describe('the pre-open gate', () => {
  it('a bath is not open until the pre-open round is recorded', () => {
    const s = bathStatus([], ROUNDS, TARGETS, { now: noon })
    expect(s.state).toBe('not_open_yet')
    expect(s.reason).toContain('Pre-open')
  })

  it('opens once the pre-open reading passes', () => {
    const s = bathStatus([{ tested_at: at('08:45'), round_key: 'pre_open', free_chlorine: 3.1, ph: 7.4, clarity_floor_visible: true }], ROUNDS, TARGETS, { now: noon })
    expect(s.state).toBe('open')
  })

})

describe('closing on a reading', () => {
  it('free chlorine below the legal minimum closes it', () => {
    const s = bathStatus([{ tested_at: at('08:45'), round_key: 'pre_open', free_chlorine: 0.8, ph: 7.4 }], ROUNDS, TARGETS, { now: noon })
    expect(s.state).toBe('closed')
    expect(s.closures[0]).toContain('below the legal minimum')
  })

  it('does not close for combined chlorine under the ceiling, even above the free', () => {
    // Ace's rule for Senza: combined chlorine closes a bath above 1.0 and not below it.
    expect(closureReasons({ free_chlorine: 1.2, combined_chlorine: 0.9, ph: 7.4, clarity_floor_visible: true }, TARGETS)).toEqual([])
  })

  it('still uses "above free" as the rule where a site sets no ceiling', () => {
    const noCeiling = TARGETS.map(t => t.parameter === 'combinedChlorine' ? { ...t, close_above: null } : t)
    const out = closureReasons({ free_chlorine: 1.2, combined_chlorine: 1.3, ph: 7.4, clarity_floor_visible: true }, noCeiling)
    expect(out.some(c => c.includes('above the free chlorine'))).toBe(true)
  })

  it('combined chlorine above the site ceiling closes it', () => {
    const s = bathStatus([{ tested_at: at('08:45'), round_key: 'pre_open', free_chlorine: 2.8, combined_chlorine: 3.1, ph: 7.4 }], ROUNDS, TARGETS, { now: noon })
    expect(s.state).toBe('closed')
    expect(s.closures.some(c => c.includes('is above 1'))).toBe(true)
  })

  it('a passing retest after a bad reading reopens it', () => {
    const s = bathStatus([
      { tested_at: at('08:45'), round_key: 'pre_open', free_chlorine: 0.8, ph: 7.4 },
      { tested_at: at('09:05'), round_key: 'pre_open', is_retest: true, free_chlorine: 3.2, ph: 7.4, clarity_floor_visible: true },
    ], ROUNDS, TARGETS, { now: noon })
    expect(s.state).toBe('open')
  })

  it('an in-range reading trips nothing', () => {
    expect(closureReasons({ free_chlorine: 3.2, total_chlorine: 3.5, combined_chlorine: 0.3, ph: 7.45, clarity_floor_visible: true }, TARGETS)).toEqual([])
  })
})

describe('rounds running late', () => {
  it('flags a round whose time has passed with nothing recorded', () => {
    const s = bathStatus([{ tested_at: at('08:45'), round_key: 'pre_open', free_chlorine: 3.1, ph: 7.4 }], ROUNDS, TARGETS,
      { now: new Date('2026-10-02T13:30:00+10:00') })
    expect(s.overdue).toEqual(['Round 2'])
  })

  it('reports the gap when nothing has been recorded for longer than the site allows', () => {
    const s = bathStatus([{ tested_at: at('08:45'), round_key: 'pre_open', free_chlorine: 3.1, ph: 7.4 }], ROUNDS, TARGETS,
      { maxGapHours: 4, now: new Date('2026-10-02T14:00:00+10:00') })
    expect(s.gapHours).toBeCloseTo(5.25, 1)
    expect(s.reason).toContain('5.3 hours')
  })

  it('says nothing about a gap inside the limit', () => {
    const s = bathStatus([{ tested_at: at('08:45'), round_key: 'pre_open', free_chlorine: 3.1, ph: 7.4 }], ROUNDS, TARGETS,
      { maxGapHours: 4, now: new Date('2026-10-02T11:00:00+10:00') })
    expect(s.gapHours).toBeNull()
  })
})

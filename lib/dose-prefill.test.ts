import { describe, it, expect } from 'vitest'
import { parseDoseAmount, matchChemical, buildPrefills } from './dose-prefill'

const chems = [
  { id: 'lc', name: 'Liquid Chlorine (12.5%)', dose_unit: 'L' },
  { id: 'bi', name: 'PoolPlus Buffer Plus (Sodium Bicarbonate)', dose_unit: 'kg' },
  { id: 'ac', name: 'Aquachem Liquid Pool Acid', dose_unit: 'L' },
  { id: 'cc', name: 'PoolPlus Water Hardener', dose_unit: 'kg' },
  { id: 'd1', name: 'Spin disc 501 — Chlorine, 3 x 3 use (50 pack)', dose_unit: 'each' },
]

describe('parseDoseAmount', () => {
  it('reads a plain dose', () => {
    expect(parseDoseAmount({ dose: '2.5 L' })).toEqual({ amount: 2.5, unit: 'L' })
    expect(parseDoseAmount({ dose: '12.0 kg' })).toEqual({ amount: 12, unit: 'kg' })
  })

  it('takes TODAY from a staged dose, never the total', () => {
    const rec = { dose: '48.0 kg in total', notes: 'Too much for one go — do it in 4 stages: add 12.0 kg now, re-test after a full turnover, repeat until in range.' }
    expect(parseDoseAmount(rec)).toEqual({ amount: 12, unit: 'kg' })
  })

  it('offers nothing for a staged dose with no per-stage figure', () => {
    expect(parseDoseAmount({ dose: '48.0 kg in total' })).toBeNull()
  })

  it('offers nothing for prose', () => {
    expect(parseDoseAmount({ dose: 'Allow to naturally dissipate (sunlight and bather load).' })).toBeNull()
    expect(parseDoseAmount({ dose: 'No separate dose' })).toBeNull()
  })

  it('offers nothing for a zero dose', () => {
    expect(parseDoseAmount({ dose: '0 L' })).toBeNull()
  })

  it('normalises the unit', () => {
    expect(parseDoseAmount({ dose: '400 mL' })?.unit).toBe('mL')
    expect(parseDoseAmount({ dose: '2 l' })?.unit).toBe('L')
  })
})

describe('matchChemical', () => {
  it('matches the obvious ones', () => {
    expect(matchChemical('Liquid Chlorine (12.5%)', chems)?.id).toBe('lc')
    expect(matchChemical('Alkalinity Up (Sodium Bicarbonate)', chems)?.id).toBe('bi')
    expect(matchChemical('pH Down (Muriatic / Hydrochloric Acid)', chems)?.id).toBe('ac')
    expect(matchChemical('Calcium Hardness Up (Calcium Chloride)', chems)?.id).toBe('cc')
  })

  it('refuses when nothing matches', () => {
    expect(matchChemical('CO₂ Injection', chems)).toBeNull()
    expect(matchChemical('None — dilute or wait', chems)).toBeNull()
  })

  it('refuses rather than guess between two candidates', () => {
    const two = [...chems, { id: 'lc2', name: 'Liquid Chlorine bulk 1000L', dose_unit: 'L' }]
    expect(matchChemical('Liquid Chlorine (12.5%)', two)).toBeNull()
  })
})

describe('buildPrefills', () => {
  const rec = (chemical: string, dose: string, notes?: string) =>
    ({ parameter: 'x', currentValue: 0, targetValue: 0, chemical, dose, direction: 'increase' as const, notes })

  it('builds a one-tap suggestion', () => {
    const out = buildPrefills([rec('Liquid Chlorine (12.5%)', '3.2 L')], chems)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ amount: 3.2, unit: 'L' })
    expect(out[0].chemical.id).toBe('lc')
  })

  it('uses the staged amount for today', () => {
    const out = buildPrefills([rec('Calcium Hardness Up (Calcium Chloride)', '48.0 kg in total',
      'Too much for one go — do it in 4 stages: add 12.0 kg now, re-test after a full turnover, repeat until in range.')], chems)
    expect(out[0].amount).toBe(12)
  })

  it('skips a dose whose unit does not match the stock item', () => {
    const grams = [{ id: 'bi', name: 'PoolPlus Buffer Plus (Sodium Bicarbonate)', dose_unit: 'g' }]
    expect(buildPrefills([rec('Alkalinity Up (Sodium Bicarbonate)', '2.0 kg')], grams)).toHaveLength(0)
  })

  it('never suggests a spin disc', () => {
    expect(buildPrefills([rec('Spin disc 501', '1 each')], chems)).toHaveLength(0)
  })

  it('does not suggest the same chemical twice', () => {
    const out = buildPrefills([rec('Liquid Chlorine (12.5%)', '3.2 L'), rec('Liquid Chlorine (12.5%)', '1.0 L')], chems)
    expect(out).toHaveLength(1)
  })
})

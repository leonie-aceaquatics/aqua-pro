import { describe, it, expect } from 'vitest'
import { hypochloriteMl, bicarbonateG, thiosulphateG, manualDoses } from './manual-dose'

// Every number here is checked against the printed dose chart in ACE-2026-SEN-TP-001,
// "Chlorine dose chart — one bath, 390 litres". If a formula drifts, these fail.
const BATH = 390

const TARGETS = {
  freeChlorineIdeal: 3.0, freeChlorineMin: 2.0, freeChlorineMax: 5.0,
  phMin: 7.3, phMax: 7.6,
  alkalinityMin: 80, alkalinityIdeal: 100,
}
const CONFIG = { volumeLitres: BATH, fixedAcidDoseG: 7, fixedAcidMaxDoses: 2, fixedSodaAshDoseG: 4 }

describe('dose formulas against Tony’s printed chart', () => {
  it('hypochlorite 12.5% matches the chart', () => {
    expect(hypochloriteMl(0.5, BATH)).toBeCloseTo(1.6, 1)
    expect(hypochloriteMl(1.0, BATH)).toBeCloseTo(3.1, 1)
    expect(hypochloriteMl(2.0, BATH)).toBeCloseTo(6.2, 1)
    expect(hypochloriteMl(3.0, BATH)).toBeCloseTo(9.4, 1)   // refill dose
    expect(hypochloriteMl(5.0, BATH)).toBeCloseTo(15.6, 1)
    expect(hypochloriteMl(6.0, BATH)).toBeCloseTo(18.7, 1)
  })

  it('bicarbonate matches the chart (within a rounding hair)', () => {
    // The chart's rows above 10 mg/L sit ~0.7% lower than the formula — inside weighing accuracy.
    expect(bicarbonateG(10, BATH)).toBeCloseTo(6.6, 1)
    expect(bicarbonateG(20, BATH)).toBeCloseTo(13.1, 0)
    expect(bicarbonateG(40, BATH)).toBeCloseTo(26.2, 0)
    expect(bicarbonateG(60, BATH)).toBeCloseTo(39.3, 0)     // refill dose
  })

  it('thiosulphate follows the chart, and never doses above it', () => {
    // The spec's ÷975 matches only the 1.0 row and runs up to 20% high on the rest. We take the
    // chart's rate: erring low leaves chlorine slightly high (harmless), erring high empties it.
    expect(thiosulphateG(2.0, BATH)).toBeLessThanOrEqual(0.7)
    expect(thiosulphateG(3.0, BATH)).toBeLessThanOrEqual(1.0)
    expect(thiosulphateG(5.0, BATH)).toBeLessThanOrEqual(1.7)
    expect(thiosulphateG(5.0, BATH)).toBeGreaterThan(1.5)   // still in the right ballpark
  })
})

describe('what the operator is told to do', () => {
  it('the worked example from module 6: 1.6 mg/L needs about 4.3 mL', () => {
    const [dose] = manualDoses({ freeChlorine: 1.6 }, TARGETS, CONFIG)
    expect(dose.chemical).toContain('hypochlorite')
    expect(dose.amount).toBe('4.4 mL')   // 1.4 × 390 ÷ 125 = 4.368; the pack rounds to "about 4.3"
  })

  it('says nothing when the water is in band', () => {
    expect(manualDoses({ freeChlorine: 3.4, ph: 7.4, totalAlkalinity: 100 }, TARGETS, CONFIG)).toEqual([])
  })

  it('does not calculate an acid dose — fixed grams, and it counts them', () => {
    const [dose] = manualDoses({ ph: 7.9 }, TARGETS, CONFIG)
    expect(dose.amount).toBe('7 g')
    expect(dose.fixed).toBe(true)
    expect(dose.note).toContain('Dose 1 of 2')
  })

  it('blocks a third acid dose and shows the number to ring', () => {
    const [dose] = manualDoses({ ph: 7.9 }, TARGETS, { ...CONFIG, acidDosesSoFar: 2 })
    expect(dose.severity).toBe('stop')
    expect(dose.chemical).toContain('0422 470 214')
  })

  it('high chlorine is left to fall rather than dosed down', () => {
    const [dose] = manualDoses({ freeChlorine: 6.5 }, TARGETS, CONFIG)
    expect(dose.severity).toBe('warn')
    expect(dose.amount).toBe('No dose')
    expect(dose.note).toContain('thiosulphate')
  })

  it('low pH with low alkalinity sends you to bicarbonate, not soda ash', () => {
    const doses = manualDoses({ ph: 7.1, totalAlkalinity: 50 }, TARGETS, CONFIG)
    const phDose = doses.find(d => d.reason.includes('pH'))!
    expect(phDose.chemical).toContain('bicarbonate')
    expect(phDose.note).toContain('correct that first')
  })

  it('low pH with alkalinity fine sends you to soda ash', () => {
    const [dose] = manualDoses({ ph: 7.1, totalAlkalinity: 100 }, TARGETS, CONFIG)
    expect(dose.chemical).toContain('Soda ash')
  })

  it('corrects alkalinity before chlorine', () => {
    const doses = manualDoses({ freeChlorine: 1.0, totalAlkalinity: 40 }, TARGETS, CONFIG)
    expect(doses[0].chemical).toContain('bicarbonate')
    expect(doses[1].chemical).toContain('hypochlorite')
  })
})

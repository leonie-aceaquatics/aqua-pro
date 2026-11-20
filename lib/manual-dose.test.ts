import { describe, it, expect } from 'vitest'
import { hypochloriteMl, bicarbonateG, thiosulphateG, manualDoses, manualDosesForSite } from './manual-dose'

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

  it('gives no acid number at a site with no fixed dose set', () => {
    const [dose] = manualDoses({ ph: 7.9 }, TARGETS, { volumeLitres: 16000 })
    expect(dose.amount).toBe('Per posted chart')
    expect(dose.note).toContain('0422 470 214')
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

describe('a site dosed from its own targets', () => {
  // AUN hot spa, 16,000 L, WQRMP v2.0 4.2. No fixed acid step set yet.
  const SPA = { volume_litres: 16000, fixed_acid_dose_g: null, fixed_soda_ash_dose_g: null }
  const SPA_TARGETS = [
    { parameter: 'freeChlorine', min_value: 3.5, max_value: 5.0, ideal_value: 4.0 },
    { parameter: 'ph', min_value: 7.4, max_value: 7.6, ideal_value: 7.5 },
    { parameter: 'totalAlkalinity', min_value: 100, max_value: 120, ideal_value: 110 },
  ]

  it('uses the site floor and ideal, not Senza’s', () => {
    const [dose] = manualDosesForSite({ freeChlorine: 3.0 }, SPA, SPA_TARGETS)
    expect(dose.amount).toBe('128 mL')   // (4.0 − 3.0) × 16,000 ÷ 125
  })

  it('alkalinity to the site ideal', () => {
    const [dose] = manualDosesForSite({ totalAlkalinity: 80 }, SPA, SPA_TARGETS)
    expect(dose.amount).toBe('812.2 g')  // (110 − 80) × 16,000 ÷ 591
  })

  it('still never puts a number on acid', () => {
    const [dose] = manualDosesForSite({ ph: 7.8 }, SPA, SPA_TARGETS)
    expect(dose.amount).toBe('Per posted chart')
  })
})

describe('AUN: the posted chart (ACE-2026-AUN-TRAIN-001, TD-3) wins over the formula', () => {
  // As changed by Tony on 21 Nov 2026: chlorine 6 (spa) / 3 (ice), nothing done under 10,
  // sodium bisulphate for pH, no alkalinity or calcium dosing.
  const row = (chemical: string, product: string, step: number, amount: number, unit: string) =>
    ({ chemical, product, step, amount, unit })
  const BIS = 'Sodium bisulphate (dry acid)'
  const SPA_CHART = [
    row('hypochlorite', 'Liquid chlorine 12.5%', 1.0, 130, 'mL'), row('hypochlorite', 'Liquid chlorine 12.5%', 5.0, 650, 'mL'),
    row('acid', BIS, 0.1, 140, 'g'), row('acid', BIS, 0.2, 275, 'g'), row('acid', BIS, 0.4, 545, 'g'),
    row('salt', 'Pool salt', 1000, 16, 'kg'),
  ]
  const ICE_CHART = [
    row('hypochlorite', 'Liquid chlorine 12.5%', 5.0, 125, 'mL'),
    row('acid', BIS, 0.1, 30, 'g'), row('acid', BIS, 0.2, 55, 'g'), row('acid', BIS, 0.4, 105, 'g'),
  ]
  const SPA = { volume_litres: 16000, retest_wait_minutes: 60 }
  const ICE = { volume_litres: 3000, retest_wait_minutes: 25 }
  const SPA_T = [
    { parameter: 'freeChlorine', min_value: 5.0, max_value: 10, ideal_value: 6.0, close_above: 10 },
    { parameter: 'ph', min_value: 7.4, max_value: 7.6, ideal_value: 7.5 },
    { parameter: 'totalAlkalinity', min_value: 100, max_value: 120, ideal_value: 110 },
    { parameter: 'calciumHardness', min_value: 150, max_value: 200, ideal_value: 175 },
  ]
  const ICE_T = [
    { parameter: 'freeChlorine', min_value: 2.5, max_value: 10, ideal_value: 3.0, close_above: 10 },
    { parameter: 'ph', min_value: 7.4, max_value: 7.6, ideal_value: 7.5 },
    { parameter: 'totalAlkalinity', min_value: 120, max_value: 150, ideal_value: 135 },
  ]

  it('spa chlorine 3.0 → 6.0 is 3 × the chart’s half cup', () => {
    const [dose] = manualDosesForSite({ freeChlorine: 3.0 }, SPA, SPA_T, 0, SPA_CHART)
    expect(dose.amount).toBe('390 mL')
  })

  it('ice bath chlorine 1.0 → 3.0 is 50 mL', () => {
    const [dose] = manualDosesForSite({ freeChlorine: 1.0 }, ICE, ICE_T, 0, ICE_CHART)
    expect(dose.amount).toBe('50 mL')
  })

  it('chlorine rounds up to the next 5 mL', () => {
    const [dose] = manualDosesForSite({ freeChlorine: 2.3 }, ICE, ICE_T, 0, ICE_CHART)
    expect(dose.amount).toBe('20 mL')   // 0.7 × 25 = 17.5
  })

  it('high chlorine is left alone up to 10', () => {
    expect(manualDosesForSite({ freeChlorine: 9.5 }, SPA, SPA_T, 0, SPA_CHART)).toEqual([])
  })

  it('over 10 closes the pool', () => {
    const [dose] = manualDosesForSite({ freeChlorine: 10.5 }, ICE, ICE_T, 0, ICE_CHART)
    expect(dose.severity).toBe('stop')
    expect(dose.chemical).toBe('CLOSE the pool')
  })

  it('spa pH 7.7 reads the 0.2 row: 275 g of bisulphate, waits 60 minutes', () => {
    const [dose] = manualDosesForSite({ ph: 7.7 }, SPA, SPA_T, 0, SPA_CHART)
    expect(dose.chemical).toBe(BIS)
    expect(dose.amount).toBe('275 g')
    expect(dose.note).toContain('60 minutes')
    expect(dose.note).toContain('bucket')
  })

  it('spa pH 7.8 goes between the 0.2 and 0.4 rows: 410 g', () => {
    const [dose] = manualDosesForSite({ ph: 7.8 }, SPA, SPA_T, 0, SPA_CHART)
    expect(dose.amount).toBe('410 g')   // 275 + 270 / 2 = 410, up to the next 5
  })

  it('ice bath pH 7.9 reads the 0.4 row: 105 g', () => {
    const [dose] = manualDosesForSite({ ph: 7.9 }, ICE, ICE_T, 0, ICE_CHART)
    expect(dose.amount).toBe('105 g')
  })

  it('more than the biggest row on the chart means stop and call Ace', () => {
    const [dose] = manualDosesForSite({ ph: 8.1 }, SPA, SPA_T, 0, SPA_CHART)
    expect(dose.severity).toBe('stop')
  })

  it('no alkalinity or calcium dosing at AUN', () => {
    expect(manualDosesForSite({ totalAlkalinity: 60, calciumHardness: 100 }, SPA, SPA_T, 0, SPA_CHART)).toEqual([])
  })

  it('low pH: no soda ash at AUN, so it points at the acid doser instead', () => {
    const [dose] = manualDosesForSite({ ph: 7.3, totalAlkalinity: 60 }, SPA, SPA_T, 0, SPA_CHART)
    expect(dose.amount).toBe('No dose')
    expect(dose.note).toContain('Halo Doser')
    expect(dose.note).not.toContain('alkalinity')
  })
})

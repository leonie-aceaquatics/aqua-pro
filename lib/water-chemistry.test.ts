import { describe, it, expect } from 'vitest'
import { calculateLSI, classifyLSI, getRanges } from './water-chemistry'

describe('calculateLSI', () => {
  it('matches the Taylor / CPO worked example (balanced water)', () => {
    // pH 7.5, 28 °C, CH 300, TA 100, TDS < 1000:
    // 7.5 + 0.68 + (log10 300 − 0.4 = 2.08) + (log10 100 = 2.0) − 12.1 ≈ 0.16
    expect(calculateLSI(7.5, 28, 300, 100)).toBeCloseTo(0.16, 1)
    expect(classifyLSI(calculateLSI(7.5, 28, 300, 100))).toBe('balanced')
  })

  it('flags cold, soft, low-alkalinity water as corrosive', () => {
    const lsi = calculateLSI(7.2, 10, 100, 60)
    expect(lsi).toBeLessThan(-0.3)
    expect(classifyLSI(lsi)).toBe('corrosive')
  })

  it('flags hot, hard, high-pH spa water as scale-forming', () => {
    const lsi = calculateLSI(8.0, 38, 400, 150)
    expect(lsi).toBeGreaterThan(0.3)
    expect(classifyLSI(lsi)).toBe('scaling')
  })

  it('cyanuric acid lowers the effective alkalinity and therefore the LSI', () => {
    const without = calculateLSI(7.5, 28, 300, 100)
    const withCya = calculateLSI(7.5, 28, 300, 100, { cyanuricAcid: 60 })
    expect(withCya).toBeLessThan(without)
  })

  it('uses the 12.2 constant for salt / high-TDS water', () => {
    const fresh = calculateLSI(7.5, 28, 300, 100, { tds: 500 })
    const salty = calculateLSI(7.5, 28, 300, 100, { tds: 4000 })
    expect(fresh - salty).toBeCloseTo(0.1, 2)
  })

  it('interpolates the temperature factor and clamps outside the table', () => {
    expect(calculateLSI(7.5, -5, 300, 100)).toBe(calculateLSI(7.5, 0, 300, 100))
    expect(calculateLSI(7.5, 45, 300, 100)).toBe(calculateLSI(7.5, 40.6, 300, 100))
    expect(calculateLSI(7.5, 26, 300, 100)).toBeGreaterThan(calculateLSI(7.5, 24, 300, 100))
  })
})

describe('cold plunge pools', () => {
  it('run chlorine above a pool and below a hot spa', () => {
    const plunge = getRanges('plunge', 'chlorine')
    const spa = getRanges('spa', 'chlorine')
    const indoor = getRanges('indoor', 'chlorine')
    expect(plunge.freeChlorine.min).toBe(2.0)
    expect(plunge.freeChlorine.min).toBeGreaterThan(indoor.freeChlorine.min)
    expect(plunge.freeChlorine.min).toBeLessThan(spa.freeChlorine.min)
  })

  it('has its own ranges rather than falling back to an outdoor pool', () => {
    // A plunge pool left to the fallback was the Senza bug: outdoor ranges put the chlorine
    // floor at 1.0, so a cold plunge sitting at 1.6 was called fine and never dosed.
    expect(getRanges('plunge', 'chlorine')).not.toEqual(getRanges('outdoor', 'chlorine'))
  })
})

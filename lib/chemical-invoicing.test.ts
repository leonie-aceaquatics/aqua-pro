import { describe, it, expect } from 'vitest'
import { toBillUnit, buildSiteInvoices, invoicesToCsv, type UsageRow } from './chemical-invoicing'

const row = (o: Partial<UsageRow>): UsageRow => ({
  pool_id: 'p1', pool_name: 'Eltham College', chemical_id: 'c1', chemical_name: 'Liquid Chlorine 12.5%',
  dose_unit: 'L', unit_cost: 2, unit_charge: 3.5, quantity: 1, ...o,
})

describe('everything bills in litres or kilograms', () => {
  it('converts millilitres to litres and grams to kilograms', () => {
    expect(toBillUnit(2500, 'mL')).toEqual({ quantity: 2.5, unit: 'L' })
    expect(toBillUnit(750, 'g')).toEqual({ quantity: 0.75, unit: 'kg' })
    expect(toBillUnit(12, 'L')).toEqual({ quantity: 12, unit: 'L' })
    expect(toBillUnit(4, 'kg')).toEqual({ quantity: 4, unit: 'kg' })
  })

  it('leaves things that are counted alone', () => {
    expect(toBillUnit(6, 'tablet')).toEqual({ quantity: 6, unit: 'each' })
  })

  it('a month of small manual doses adds up to a readable figure', () => {
    // Senza: 9.4 mL a night across three baths for 30 days
    const rows = Array.from({ length: 90 }, () => row({ dose_unit: 'mL', quantity: 9.4, unit_charge: 4, unit_cost: 2 }))
    const [site] = buildSiteInvoices(rows)
    expect(site.lines[0].quantity).toBeCloseTo(0.85, 2)   // 846 mL
    expect(site.lines[0].unit).toBe('L')
  })
})

describe('what goes on the invoice', () => {
  it('totals each chemical per site and charges at the marked up rate', () => {
    const [site] = buildSiteInvoices([
      row({ quantity: 10 }),
      row({ quantity: 5 }),
      row({ chemical_id: 'c2', chemical_name: 'Sodium Bicarbonate', dose_unit: 'kg', quantity: 8, unit_cost: 1.5, unit_charge: 2.5 }),
    ])
    const chlorine = site.lines.find(l => l.chemical.includes('Chlorine'))!
    expect(chlorine.quantity).toBe(15)
    expect(chlorine.charge).toBe(52.5)      // 15 L x 3.50
    expect(chlorine.cost).toBe(30)          // 15 L x 2.00
    expect(site.charge).toBe(72.5)          // + 8 kg x 2.50
    expect(site.cost).toBe(42)
    expect(site.margin).toBe(30.5)
  })

  it('keeps sites apart', () => {
    const invoices = buildSiteInvoices([
      row({ quantity: 10 }),
      row({ pool_id: 'p2', pool_name: 'AAMI Park', quantity: 4 }),
    ])
    expect(invoices.map(i => i.pool)).toEqual(['AAMI Park', 'Eltham College'])
    expect(invoices[0].charge).toBe(14)
  })

  it('flags a chemical with no charge rate instead of billing it at nothing', () => {
    const [site] = buildSiteInvoices([row({ quantity: 10, unit_charge: null })])
    expect(site.lines[0].charge).toBeNull()
    expect(site.unpriced).toEqual(['Liquid Chlorine 12.5%'])
    expect(site.charge).toBe(0)
  })

  it('ignores a zero or negative quantity', () => {
    expect(buildSiteInvoices([row({ quantity: 0 })])).toEqual([])
  })
})

describe('the spreadsheet', () => {
  it('has a line per chemical, a site total and a grand total', () => {
    const csv = invoicesToCsv(buildSiteInvoices([row({ quantity: 10 })]), '2026-09-01', '2026-09-30')
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Site,Chemical,Quantity,Unit,Cost rate,Cost,Charge rate,Charge,Margin')
    expect(lines[1]).toContain('Eltham College')
    expect(lines[2]).toContain('SITE TOTAL')
    expect(lines[3]).toContain('ALL SITES')
    expect(lines[3]).toContain('2026-09-01 to 2026-09-30')
  })

  it('carries the cost even when nothing has a charge rate', () => {
    const csv = invoicesToCsv(buildSiteInvoices([row({ quantity: 10, unit_charge: null, unit_cost: 0.83 })]), 'a', 'b')
    expect(csv).toContain('8.3')          // 10 L at $0.83
    expect(csv).not.toContain('NaN')
  })

  it('quotes a site name containing a comma', () => {
    const csv = invoicesToCsv(buildSiteInvoices([row({ pool_name: 'Acacia Place, Haven' })]), 'a', 'b')
    expect(csv).toContain('"Acacia Place, Haven"')
  })
})

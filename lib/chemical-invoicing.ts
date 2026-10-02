// Chemical usage per site, totalled for invoicing.
//
// Doses are logged in whatever unit the chemical is measured in — litres, kilograms, but also
// millilitres and grams for the small manual sites. An invoice wants litres and kilograms, so
// everything is normalised before it is totalled: 2,500 mL of chlorine across a month is 2.5 L
// on the invoice, not a number nobody can read.

export type BillUnit = 'L' | 'kg' | 'each'

/** mL and g are the same substance as L and kg, just a smaller measure. */
export function toBillUnit(quantity: number, doseUnit: string | null | undefined): { quantity: number; unit: BillUnit } {
  switch ((doseUnit ?? 'L').toLowerCase()) {
    case 'ml': return { quantity: quantity / 1000, unit: 'L' }
    case 'l':  return { quantity, unit: 'L' }
    case 'g':  return { quantity: quantity / 1000, unit: 'kg' }
    case 'kg': return { quantity, unit: 'kg' }
    default:   return { quantity, unit: 'each' }   // tablets and the like are counted
  }
}

export interface UsageRow {
  pool_id: string
  pool_name: string
  chemical_id: string
  chemical_name: string
  dose_unit: string | null
  unit_cost: number | null
  unit_charge: number | null
  quantity: number
}

export interface InvoiceLine {
  chemicalId: string
  chemical: string
  quantity: number
  unit: BillUnit
  /** Per billed unit. Null when the chemical has no rate set. */
  rate: number | null
  charge: number | null
  cost: number | null
}

export interface SiteInvoice {
  poolId: string
  pool: string
  lines: InvoiceLine[]
  charge: number
  cost: number
  margin: number
  /** Chemicals used here that have no charge rate, so cannot be billed yet. */
  unpriced: string[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** One block per site, each with a line per chemical. Sites with no usage are left out. */
export function buildSiteInvoices(rows: UsageRow[]): SiteInvoice[] {
  const bySite = new Map<string, SiteInvoice>()

  for (const r of rows) {
    const { quantity, unit } = toBillUnit(Number(r.quantity) || 0, r.dose_unit)
    if (quantity <= 0) continue

    let site = bySite.get(r.pool_id)
    if (!site) {
      site = { poolId: r.pool_id, pool: r.pool_name, lines: [], charge: 0, cost: 0, margin: 0, unpriced: [] }
      bySite.set(r.pool_id, site)
    }

    let line = site.lines.find(l => l.chemicalId === r.chemical_id)
    if (!line) {
      line = {
        chemicalId: r.chemical_id, chemical: r.chemical_name, quantity: 0, unit,
        rate: r.unit_charge ?? null, charge: r.unit_charge != null ? 0 : null, cost: r.unit_cost != null ? 0 : null,
      }
      site.lines.push(line)
    }
    line.quantity += quantity
  }

  for (const site of bySite.values()) {
    for (const line of site.lines) {
      line.quantity = round2(line.quantity)
      if (line.rate != null) line.charge = round2(line.quantity * line.rate)
      const costRate = rows.find(r => r.chemical_id === line.chemicalId)?.unit_cost
      line.cost = costRate != null ? round2(line.quantity * costRate) : null
      if (line.charge == null) site.unpriced.push(line.chemical)
    }
    site.lines.sort((a, b) => a.chemical.localeCompare(b.chemical))
    site.charge = round2(site.lines.reduce((s, l) => s + (l.charge ?? 0), 0))
    site.cost = round2(site.lines.reduce((s, l) => s + (l.cost ?? 0), 0))
    site.margin = round2(site.charge - site.cost)
  }

  return [...bySite.values()].sort((a, b) => a.pool.localeCompare(b.pool))
}

/** A spreadsheet of the same thing, one row per site and chemical. */
export function invoicesToCsv(invoices: SiteInvoice[], from: string, to: string): string {
  const esc = (v: any) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [['Site', 'Chemical', 'Quantity', 'Unit', 'Rate', 'Charge', 'Cost', 'Margin'].join(',')]
  for (const site of invoices) {
    for (const l of site.lines) {
      lines.push([site.pool, l.chemical, l.quantity, l.unit, l.rate ?? '', l.charge ?? '', l.cost ?? '',
        l.charge != null && l.cost != null ? round2(l.charge - l.cost) : ''].map(esc).join(','))
    }
    lines.push([site.pool, 'SITE TOTAL', '', '', '', site.charge, site.cost, site.margin].map(esc).join(','))
  }
  const total = round2(invoices.reduce((s, i) => s + i.charge, 0))
  const totalCost = round2(invoices.reduce((s, i) => s + i.cost, 0))
  lines.push(['ALL SITES', `${from} to ${to}`, '', '', '', total, totalCost, round2(total - totalCost)].map(esc).join(','))
  return lines.join('\n')
}

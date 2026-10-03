import type { DoseRecommendation } from './water-chemistry'

// Turning "what you should add" into "what I added", so a technician confirms a number instead
// of reading it off one screen and typing it into another.
//
// Two things this has to get right or it quietly costs money. A staged recommendation prints the
// WHOLE correction in `dose` and only the part for today in `notes` — prefilling the headline
// figure would record several visits' chemical against one visit and over-bill the site. And a
// recommendation that is prose rather than a number ("allow to dissipate") must offer nothing at
// all, rather than a guess.

export interface ParsedDose { amount: number; unit: string }

const AMOUNT = /(\d+(?:\.\d+)?)\s*(mL|L|kg|g|tablets?)\b/i
/** Staged doses say "add 4.0 kg now" in the notes; that is today's amount, not the total. */
const STAGE = /add\s+(\d+(?:\.\d+)?)\s*(mL|L|kg|g)\b\s+now/i

const unit = (u: string) => {
  const l = u.toLowerCase()
  if (l === 'l') return 'L'
  if (l === 'ml') return 'mL'
  if (l.startsWith('tablet')) return 'tablet'
  return l   // kg, g
}

/** What to put in the quantity box today, or null when there is no clean number to offer. */
export function parseDoseAmount(rec: Pick<DoseRecommendation, 'dose' | 'notes'>): ParsedDose | null {
  const stage = rec.notes?.match(STAGE)
  if (stage) return { amount: Number(stage[1]), unit: unit(stage[2]) }
  if (/in total/i.test(rec.dose)) return null   // staged, but no per-stage figure to trust
  const m = rec.dose.match(AMOUNT)
  if (!m) return null
  const amount = Number(m[1])
  return amount > 0 ? { amount, unit: unit(m[2]) } : null
}

// The dose engine names a chemical the way an operator says it; the stock list names it the way
// the supplier prints it. These are the words that reliably mean the same product.
const CONCEPTS: { match: RegExp; keywords: string[] }[] = [
  { match: /liquid chlorine|hypochlorite.*12|sodium hypochlorite/i, keywords: ['liquid chlor', 'sodium hypochlor'] },
  { match: /calcium hypochlorite|cal hypo|granular chlorine|procal/i, keywords: ['calcium hypochlor', 'cal hypo', 'pro cal', 'procal', 'granular chlor'] },
  { match: /soda ash|sodium carbonate|ph up/i, keywords: ['soda ash', 'sodium carbonate', 'ph lift', 'ph up'] },
  { match: /hydrochloric|muriatic|ph down/i, keywords: ['hydrochloric', 'muriatic', 'pool acid', 'ph down'] },
  { match: /dry acid|sodium bisulphate/i, keywords: ['dry acid', 'bisulphate', 'ph drop'] },
  { match: /bicarbonate|alkalinity up|buffer/i, keywords: ['bicarb', 'buffer'] },
  { match: /calcium chloride|hardness up|water hardener/i, keywords: ['calcium chloride', 'hardener'] },
  { match: /cyanuric|stabiliser|stabilizer|sunblock/i, keywords: ['cyanuric', 'stabilis', 'sunblock'] },
  { match: /thiosulphate|neutralis/i, keywords: ['thiosulphate', 'neutralis'] },
  { match: /algaecide/i, keywords: ['algaecide', 'algae'] },
  { match: /clarifier/i, keywords: ['clarifier', 'diamond clear'] },
  { match: /floccul|alum/i, keywords: ['floc'] },
  { match: /salt/i, keywords: ['salt'] },
]

export interface StockChemical { id: string; name: string; dose_unit?: string | null; unit?: string | null }

/**
 * The stock item a recommendation refers to, or null. Null when nothing matches AND when more
 * than one thing does — an ambiguous guess puts the wrong product on the client's invoice, so
 * the technician picks it themselves.
 */
export function matchChemical(recChemical: string, chemicals: StockChemical[]): StockChemical | null {
  const concept = CONCEPTS.find(c => c.match.test(recChemical))
  if (!concept) return null
  const hits = chemicals.filter(c => {
    const n = c.name.toLowerCase()
    return concept.keywords.some(k => n.includes(k))
  })
  return hits.length === 1 ? hits[0] : null
}

export interface Prefill { chemical: StockChemical; amount: number; unit: string; label: string }

/** The one-tap suggestions for a set of recommendations. Anything uncertain is simply left out. */
export function buildPrefills(recs: DoseRecommendation[], chemicals: StockChemical[]): Prefill[] {
  const out: Prefill[] = []
  for (const rec of recs) {
    const parsed = parseDoseAmount(rec)
    if (!parsed) continue
    const chemical = matchChemical(rec.chemical, chemicals)
    if (!chemical) continue
    // Only offer it when the stock item is measured in the unit the dose came out in; converting
    // behind the technician's back is how a litre becomes a kilogram on an invoice.
    const stockUnit = chemical.dose_unit ?? chemical.unit
    if (stockUnit && stockUnit !== parsed.unit) continue
    if (out.some(p => p.chemical.id === chemical.id)) continue
    out.push({ chemical, amount: parsed.amount, unit: parsed.unit, label: `${parsed.amount} ${parsed.unit} ${chemical.name}` })
  }
  return out
}

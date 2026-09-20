// Water chemistry calculations and risk classification for AquaPro

export type PoolType = 'indoor' | 'outdoor' | 'spa' | 'wading' | 'hydrotherapy' | 'leisure' | 'splash_pad'
export type SanitiserType = 'chlorine' | 'bromine' | 'saltwater' | 'uv_chlorine' | 'ozone_chlorine' | 'baquacil'
export type RiskLevel = 'green' | 'yellow' | 'orange' | 'red'

export interface WaterTestValues {
  freeChlorine?: number
  combinedChlorine?: number
  totalChlorine?: number
  bromine?: number
  ph?: number
  totalAlkalinity?: number
  calciumHardness?: number
  cyanuricAcid?: number
  totalDissolvedSolids?: number
  saltLevel?: number
  phosphates?: number
  temperatureC?: number
  turbidity?: number
}

export interface ParameterRange {
  min: number
  max: number
  ideal: number
  unit: string
  priority: 'critical' | 'high' | 'normal'
  label: string
}

// Default ranges by pool type and sanitiser
const RANGES: Record<string, Record<string, ParameterRange>> = {
  outdoor_chlorine: {
    freeChlorine:       { min: 1.0, max: 3.0,  ideal: 2.0,  unit: 'ppm', priority: 'critical', label: 'Free Chlorine' },
    combinedChlorine:   { min: 0,   max: 0.2,  ideal: 0.0,  unit: 'ppm', priority: 'high',     label: 'Combined Chlorine' },
    ph:                 { min: 7.2, max: 7.8,  ideal: 7.5,  unit: 'pH',  priority: 'critical', label: 'pH' },
    totalAlkalinity:    { min: 80,  max: 150,  ideal: 100,  unit: 'ppm', priority: 'high',     label: 'Total Alkalinity' },
    calciumHardness:    { min: 100, max: 300,  ideal: 200,  unit: 'ppm', priority: 'normal',   label: 'Calcium Hardness' },
    cyanuricAcid:       { min: 30,  max: 50,   ideal: 40,   unit: 'ppm', priority: 'high',     label: 'Cyanuric Acid' },
    totalDissolvedSolids: { min: 0, max: 3000, ideal: 1500, unit: 'ppm', priority: 'normal',   label: 'Total Dissolved Solids' },
    phosphates:         { min: 0,   max: 100,  ideal: 0,    unit: 'ppb', priority: 'normal',   label: 'Phosphates' },
  },
  outdoor_saltwater: {
    freeChlorine:       { min: 1.0, max: 3.0,  ideal: 2.0,  unit: 'ppm', priority: 'critical', label: 'Free Chlorine' },
    combinedChlorine:   { min: 0,   max: 0.2,  ideal: 0.0,  unit: 'ppm', priority: 'high',     label: 'Combined Chlorine' },
    ph:                 { min: 7.2, max: 7.8,  ideal: 7.5,  unit: 'pH',  priority: 'critical', label: 'pH' },
    totalAlkalinity:    { min: 80,  max: 150,  ideal: 100,  unit: 'ppm', priority: 'high',     label: 'Total Alkalinity' },
    calciumHardness:    { min: 100, max: 300,  ideal: 200,  unit: 'ppm', priority: 'normal',   label: 'Calcium Hardness' },
    cyanuricAcid:       { min: 30,  max: 50,   ideal: 40,   unit: 'ppm', priority: 'high',     label: 'Cyanuric Acid' },
    saltLevel:          { min: 2700, max: 3400, ideal: 3000, unit: 'ppm', priority: 'high',    label: 'Salt Level' },
    phosphates:         { min: 0,   max: 100,  ideal: 0,    unit: 'ppb', priority: 'normal',   label: 'Phosphates' },
  },
  indoor_chlorine: {
    freeChlorine:       { min: 1.0, max: 3.0,  ideal: 2.0,  unit: 'ppm', priority: 'critical', label: 'Free Chlorine' },
    combinedChlorine:   { min: 0,   max: 0.2,  ideal: 0.0,  unit: 'ppm', priority: 'critical', label: 'Combined Chlorine' },
    ph:                 { min: 7.2, max: 7.8,  ideal: 7.5,  unit: 'pH',  priority: 'critical', label: 'pH' },
    totalAlkalinity:    { min: 80,  max: 150,  ideal: 100,  unit: 'ppm', priority: 'high',     label: 'Total Alkalinity' },
    calciumHardness:    { min: 100, max: 300,  ideal: 200,  unit: 'ppm', priority: 'normal',   label: 'Calcium Hardness' },
    phosphates:         { min: 0,   max: 100,  ideal: 0,    unit: 'ppb', priority: 'normal',   label: 'Phosphates' },
  },
  spa_chlorine: {
    freeChlorine:       { min: 3.0, max: 5.0,  ideal: 4.0,  unit: 'ppm', priority: 'critical', label: 'Free Chlorine' },
    combinedChlorine:   { min: 0,   max: 0.2,  ideal: 0.0,  unit: 'ppm', priority: 'critical', label: 'Combined Chlorine' },
    ph:                 { min: 7.2, max: 7.8,  ideal: 7.5,  unit: 'pH',  priority: 'critical', label: 'pH' },
    totalAlkalinity:    { min: 80,  max: 150,  ideal: 100,  unit: 'ppm', priority: 'high',     label: 'Total Alkalinity' },
    calciumHardness:    { min: 150, max: 250,  ideal: 200,  unit: 'ppm', priority: 'normal',   label: 'Calcium Hardness' },
  },
  spa_bromine: {
    bromine:            { min: 3.0, max: 5.0,  ideal: 4.0,  unit: 'ppm', priority: 'critical', label: 'Bromine' },
    ph:                 { min: 7.2, max: 7.8,  ideal: 7.5,  unit: 'pH',  priority: 'critical', label: 'pH' },
    totalAlkalinity:    { min: 80,  max: 150,  ideal: 100,  unit: 'ppm', priority: 'high',     label: 'Total Alkalinity' },
    calciumHardness:    { min: 150, max: 250,  ideal: 200,  unit: 'ppm', priority: 'normal',   label: 'Calcium Hardness' },
  },
  // Sourced from a real WQRMP (Better Health Network hydrotherapy pool, Aug 2026, Section 5.1) —
  // no hydrotherapy targets existed in this codebase before that. Warm water (34-36C), high bather
  // load and typically no secondary disinfection push these tighter than a standard indoor pool.
  hydrotherapy_chlorine: {
    freeChlorine:       { min: 2.5, max: 3.5,  ideal: 2.75, unit: 'ppm', priority: 'critical', label: 'Free Chlorine' },
    combinedChlorine:   { min: 0,   max: 0.5,  ideal: 0.0,  unit: 'ppm', priority: 'critical', label: 'Combined Chlorine' },
    totalChlorine:      { min: 0,   max: 4.0,  ideal: 2.5,  unit: 'ppm', priority: 'high',     label: 'Total Chlorine' },
    ph:                 { min: 7.2, max: 7.8,  ideal: 7.5,  unit: 'pH',  priority: 'critical', label: 'pH' },   // Tony: 7.2–7.8 everywhere (WQRMP had 7.4–7.6)
    totalAlkalinity:    { min: 100, max: 140,  ideal: 120,  unit: 'ppm', priority: 'high',     label: 'Total Alkalinity' },
    calciumHardness:    { min: 100, max: 250,  ideal: 175,  unit: 'ppm', priority: 'normal',   label: 'Calcium Hardness' },
    turbidity:          { min: 0,   max: 0.5,  ideal: 0.2,  unit: 'NTU', priority: 'high',     label: 'Turbidity' },
  },
}

export function getRanges(poolType: PoolType, sanitiserType: SanitiserType): Record<string, ParameterRange> {
  const key = `${poolType}_${sanitiserType}`
  return RANGES[key] ?? RANGES['outdoor_chlorine']
}

export interface RiskResult {
  riskLevel: RiskLevel
  flags: string[]         // parameter keys that are out of range
  criticalFlags: string[] // critical parameters out of range
}

// Per-site closure threshold override (pools.close_threshold_*) — a facility's real TARP
// closure standard often doesn't match the generic codebase default (e.g. a hydrotherapy WQRMP
// closing at FC < 2.0, well above the generic < 0.5 floor). Undefined/null fields fall back to
// the original hardcoded defaults, so a pool with no overrides behaves exactly as before.
export interface RiskThresholdOverrides {
  closeThresholdFreeChlorine?: number | null
  closeThresholdPhLow?: number | null
  closeThresholdPhHigh?: number | null
}

export function classifyRisk(
  values: WaterTestValues,
  poolType: PoolType,
  sanitiserType: SanitiserType,
  overrides?: RiskThresholdOverrides,
): RiskResult {
  const ranges = getRanges(poolType, sanitiserType)
  const flags: string[] = []
  const criticalFlags: string[] = []

  for (const [key, range] of Object.entries(ranges)) {
    const val = values[key as keyof WaterTestValues]
    if (val === undefined || val === null) continue
    if (val < range.min || val > range.max) {
      flags.push(key)
      if (range.priority === 'critical') criticalFlags.push(key)
    }
  }

  const fcCloseAt = overrides?.closeThresholdFreeChlorine ?? 0.5
  const phLowCloseAt = overrides?.closeThresholdPhLow ?? 6.8
  const phHighCloseAt = overrides?.closeThresholdPhHigh ?? 8.2

  let riskLevel: RiskLevel = 'green'
  if (criticalFlags.length >= 1) {
    // pH outside the site's closure band, or FC below the site's closure floor = RED (immediate closure risk)
    const phVal = values.ph
    const fcVal = values.freeChlorine
    if ((phVal !== undefined && (phVal < phLowCloseAt || phVal > phHighCloseAt)) ||
        (fcVal !== undefined && fcVal < fcCloseAt)) {
      riskLevel = 'red'
    } else {
      riskLevel = 'orange'
    }
  } else if (flags.length >= 2) {
    riskLevel = 'orange'
  } else if (flags.length === 1) {
    riskLevel = 'yellow'
  }

  return { riskLevel, flags, criticalFlags }
}

// ── Langelier Saturation Index (scale balance) ────────────────────────────────
// Pool-industry (APSP / CPO / Taylor) form:
//   LSI = pH + TF + CF + AF − TDSF
//   TF   temperature factor (Taylor table, interpolated between rows)
//   CF   = log10(calcium hardness) − 0.4
//   AF   = log10(carbonate alkalinity), carbonate alk = TA − CYA/3 (cyanurate correction at pool pH)
//   TDSF = 12.1 below 1000 ppm TDS, 12.2 at/above (salt pools)
// −0.3 … +0.3 balanced; below is corrosive (etching), above is scale-forming.

const LSI_TEMP_FACTORS: [number, number][] = [   // [°C, TF]
  [0, 0.0], [2.8, 0.1], [7.8, 0.2], [11.7, 0.3], [15.6, 0.4],
  [18.9, 0.5], [24.4, 0.6], [28.9, 0.7], [34.4, 0.8], [40.6, 0.9],
]

function lsiTemperatureFactor(tempC: number): number {
  const t = LSI_TEMP_FACTORS
  if (tempC <= t[0][0]) return t[0][1]
  if (tempC >= t[t.length - 1][0]) return t[t.length - 1][1]
  for (let i = 1; i < t.length; i++) {
    const [c1, f1] = t[i]
    if (tempC <= c1) {
      const [c0, f0] = t[i - 1]
      return f0 + ((tempC - c0) / (c1 - c0)) * (f1 - f0)
    }
  }
  return t[t.length - 1][1]
}

export interface LSIOptions {
  cyanuricAcid?: number   // ppm — corrects alkalinity for cyanurate
  tds?: number            // ppm — picks the 12.1 / 12.2 constant
}

export function calculateLSI(
  ph: number, tempC: number, calciumHardness: number, totalAlkalinity: number, opts: LSIOptions = {},
): number {
  const carbonateAlk = Math.max(1, totalAlkalinity - (opts.cyanuricAcid ?? 0) / 3)
  const tf = lsiTemperatureFactor(tempC)
  const cf = Math.log10(Math.max(1, calciumHardness)) - 0.4
  const af = Math.log10(carbonateAlk)
  const tdsf = (opts.tds ?? 0) >= 1000 ? 12.2 : 12.1
  return Math.round((ph + tf + cf + af - tdsf) * 100) / 100
}

export type LSIStatus = 'corrosive' | 'balanced' | 'scaling'

export function classifyLSI(lsi: number): LSIStatus {
  if (lsi < -0.3) return 'corrosive'
  if (lsi > 0.3) return 'scaling'
  return 'balanced'
}

export const LSI_LABELS: Record<LSIStatus, string> = {
  corrosive: 'Corrosive — water will etch plaster/grout and attack metal',
  balanced:  'Balanced',
  scaling:   'Scale-forming — calcium will deposit on surfaces and heaters',
}

// ── Instant alarms while typing a test ────────────────────────────────────────
// Tony's rule for every site: alkalinity at or below 80 → add sodium bicarbonate now;
// calcium hardness below 90 → add calcium chloride now. Shown the moment the number is typed.
export interface InstantAlert { parameter: string; headline: string; action: string; dose?: string; severe: boolean }

// "Well below" — the full-screen alarm, not just a red box
export const SEVERE_TA = 60
export const SEVERE_CH = 60

export function instantBalanceAlerts(ta?: number | null, ch?: number | null, volumeLitres?: number | null): InstantAlert[] {
  const alerts: InstantAlert[] = []
  const volKL = volumeLitres ? volumeLitres / 1000 : 0
  // Same rule of thumb as calculateDoses: ~1.5 kg per 10 ppm per 100 kL
  const kgFor = (deficitPpm: number) => volKL > 0 ? `about ${((deficitPpm / 10) * (volKL / 100) * 1.5).toFixed(1)} kg` : undefined
  if (ta != null && !isNaN(ta) && ta <= 80) {
    alerts.push({
      parameter: 'Total Alkalinity',
      headline: `${ta <= SEVERE_TA ? 'VERY ' : ''}LOW ALKALINITY — ${ta} ppm`,
      action: 'Add sodium bicarbonate now to bring it to 100 ppm, then re-test.',
      dose: kgFor(100 - ta),
      severe: ta <= SEVERE_TA,
    })
  }
  if (ch != null && !isNaN(ch) && ch < 90) {
    alerts.push({
      parameter: 'Calcium Hardness',
      headline: `${ch < SEVERE_CH ? 'VERY ' : ''}LOW CALCIUM HARDNESS — ${ch} ppm`,
      action: 'Add calcium chloride now to bring it to 200 ppm (pre-dissolve in a bucket) — in stages if it is a big pool — then re-test.',
      dose: kgFor(200 - ch),
      severe: ch < SEVERE_CH,
    })
  }
  return alerts
}

// ── Chemical dose calculator ───────────────────────────────────────────────────
// Returns: how much chemical to add (and what chemical) to hit target

export interface DoseRecommendation {
  parameter: string
  currentValue: number
  targetValue: number
  chemical: string
  dose: string
  direction: 'increase' | 'decrease'
  notes?: string
}

export type PhCorrectionMethod = 'acid' | 'co2'

// Big corrections are done in stages, not one hit: a 500 kL pool that needs 100 kg of calcium
// chloride gets it over several visits. `dose` is the whole correction; `stage` is what to add today.
function staged(totalAmount: number, totalPpm: number, maxPpmPerStage: number, unit: string, decimals = 1) {
  const fmt = (n: number) => `${n.toFixed(decimals)} ${unit}`
  if (totalPpm <= maxPpmPerStage) return { dose: fmt(totalAmount), notes: '' }
  const stages = Math.ceil(totalPpm / maxPpmPerStage)
  const perStage = totalAmount / stages
  return {
    dose: `${fmt(totalAmount)} in total`,
    notes: `Too much for one go — do it in ${stages} stages: add ${fmt(perStage)} now, re-test after a full turnover, repeat until in range.`,
  }
}

export function calculateDoses(
  values: WaterTestValues,
  poolType: PoolType,
  sanitiserType: SanitiserType,
  volumeLitres: number,
  phCorrectionMethod: PhCorrectionMethod = 'acid',
): DoseRecommendation[] {
  const ranges = getRanges(poolType, sanitiserType)
  const recs: DoseRecommendation[] = []
  const volKL = volumeLitres / 1000

  // Free Chlorine — prioritise first
  if (values.freeChlorine !== undefined && ranges.freeChlorine) {
    const r = ranges.freeChlorine
    if (values.freeChlorine < r.min) {
      const deficit = r.ideal - values.freeChlorine  // ppm deficit
      // Liquid chlorine (12.5%) ≈ 0.8 kg raises 1 ppm per 100kL
      const litres = ((deficit / 1) * (volKL / 100) * 0.8).toFixed(1)
      recs.push({
        parameter: 'Free Chlorine',
        currentValue: values.freeChlorine,
        targetValue: r.ideal,
        chemical: 'Liquid Chlorine (12.5%)',
        dose: `${litres} L`,
        direction: 'increase',
        notes: 'Add in small increments. Re-test after 30 minutes circulation.',
      })
    } else if (values.freeChlorine > r.max) {
      recs.push({
        parameter: 'Free Chlorine',
        currentValue: values.freeChlorine,
        targetValue: r.max,
        chemical: 'None — dilute or wait',
        dose: 'Allow to naturally dissipate (sunlight and bather load). Consider partial drain and refill if significantly elevated.',
        direction: 'decrease',
      })
    }
  }

  // pH
  if (values.ph !== undefined && ranges.ph) {
    const r = ranges.ph
    if (values.ph < r.min) {
      const deficit = r.ideal - values.ph
      const kg = ((deficit / 0.1) * (volKL / 100) * 0.18).toFixed(2)
      recs.push({
        parameter: 'pH',
        currentValue: values.ph,
        targetValue: r.ideal,
        chemical: 'pH Up (Sodium Carbonate / Soda Ash)',
        dose: `${kg} kg`,
        direction: 'increase',
        notes: 'Pre-dissolve in bucket of water. Add with pump running. Re-test after 4 hours.',
      })
    } else if (values.ph > r.max) {
      const excess = values.ph - r.ideal
      if (phCorrectionMethod === 'co2') {
        // CO2 injection lowers pH without the total-alkalinity drop acid causes — common for
        // commercial/hydrotherapy sites with a dosing controller already fitted for it.
        const kgPerDay = ((excess / 0.1) * (volKL / 100) * 0.09).toFixed(2)
        recs.push({
          parameter: 'pH',
          currentValue: values.ph,
          targetValue: r.ideal,
          chemical: 'CO₂ Injection',
          dose: `~${kgPerDay} kg/day via dosing controller`,
          direction: 'decrease',
          notes: 'Confirm CO2 injection rate at the controller — this is an approximate daily consumption target, not a single manual dose. Re-test after the controller has run a full cycle (check controller log, typically 2-4 hours).',
        })
      } else if (values.totalAlkalinity !== undefined && ranges.totalAlkalinity && values.totalAlkalinity > ranges.totalAlkalinity.max) {
        // Alkalinity is high too — the acid dosed for alkalinity (below) brings pH down with it.
        // Recommending acid twice would double-dose.
        recs.push({
          parameter: 'pH',
          currentValue: values.ph,
          targetValue: r.ideal,
          chemical: 'Covered by the alkalinity acid dose below',
          dose: 'No separate dose',
          direction: 'decrease',
          notes: 'Re-test pH after the alkalinity correction has circulated. Only dose pH on its own if it is still high then.',
        })
      } else {
        const L = ((excess / 0.1) * (volKL / 100) * 0.12).toFixed(1)
        recs.push({
          parameter: 'pH',
          currentValue: values.ph,
          targetValue: r.ideal,
          chemical: 'pH Down (Muriatic / Hydrochloric Acid)',
          dose: `${L} L`,
          direction: 'decrease',
          notes: 'Add acid SLOWLY with pump running — never add water to acid. Re-test after 4 hours.',
        })
      }
    }
  }

  // Total Alkalinity
  if (values.totalAlkalinity !== undefined && ranges.totalAlkalinity) {
    const r = ranges.totalAlkalinity
    if (values.totalAlkalinity < r.min) {
      const deficit = r.ideal - values.totalAlkalinity
      const st = staged((deficit / 10) * (volKL / 100) * 1.5, deficit, 40, 'kg')
      recs.push({
        parameter: 'Total Alkalinity',
        currentValue: values.totalAlkalinity,
        targetValue: r.ideal,
        chemical: 'Alkalinity Up (Sodium Bicarbonate)',
        dose: st.dose,
        direction: 'increase',
        notes: `Broadcast across pool surface with pump running. Re-test after 6 hours. ${st.notes}`.trim(),
      })
    } else if (values.totalAlkalinity > r.max) {
      const excess = values.totalAlkalinity - r.ideal
      // ~2 L of 31% hydrochloric acid lowers alkalinity 10 ppm per 100 kL
      const st = staged((excess / 10) * (volKL / 100) * 2.0, excess, 30, 'L')
      recs.push({
        parameter: 'Total Alkalinity',
        currentValue: values.totalAlkalinity,
        targetValue: r.ideal,
        chemical: 'pH Down (Muriatic / Hydrochloric Acid)',
        dose: st.dose,
        direction: 'decrease',
        notes: `Add to deep end with pump off, let it sit, then circulate. This also lowers pH — re-test both. ${st.notes}`.trim(),
      })
    }
  }

  // Calcium Hardness
  if (values.calciumHardness !== undefined && ranges.calciumHardness) {
    const r = ranges.calciumHardness
    if (values.calciumHardness < r.min) {
      const deficit = r.ideal - values.calciumHardness
      const st = staged((deficit / 10) * (volKL / 100) * 1.5, deficit, 60, 'kg')
      recs.push({
        parameter: 'Calcium Hardness',
        currentValue: values.calciumHardness,
        targetValue: r.ideal,
        chemical: 'Calcium Chloride (Hardness Up)',
        dose: st.dose,
        direction: 'increase',
        notes: `Pre-dissolve in a bucket. Add with pump running. Changes gradually — re-test next visit. ${st.notes}`.trim(),
      })
    } else if (values.calciumHardness > r.max) {
      recs.push({
        parameter: 'Calcium Hardness',
        currentValue: values.calciumHardness,
        targetValue: r.max,
        chemical: 'Partial drain and refill',
        dose: `Drain approx ${Math.round((values.calciumHardness - r.ideal) / values.calciumHardness * 100)}% of pool volume and refill with fresh water`,
        direction: 'decrease',
        notes: 'Calcium cannot be chemically reduced — dilution is the only option.',
      })
    }
  }

  // Salt (saltwater pools)
  if (values.saltLevel !== undefined && ranges.saltLevel) {
    const r = ranges.saltLevel
    if (values.saltLevel < r.min) {
      const deficit = r.ideal - values.saltLevel
      const kg = ((deficit / 1000) * volumeLitres * 1.0).toFixed(0)
      recs.push({
        parameter: 'Salt Level',
        currentValue: values.saltLevel,
        targetValue: r.ideal,
        chemical: 'Pool Grade Salt (NaCl)',
        dose: `${kg} kg`,
        direction: 'increase',
        notes: 'Pre-dissolve or broadcast evenly. Allow 24 hours to fully dissolve before re-testing.',
      })
    } else if (values.saltLevel > r.max) {
      const excess = values.saltLevel - r.ideal
      const pct = Math.round((excess / values.saltLevel) * 100)
      recs.push({
        parameter: 'Salt Level',
        currentValue: values.saltLevel,
        targetValue: r.ideal,
        chemical: 'Partial drain and refill with fresh water',
        dose: `Drain and replace approximately ${pct}% of pool volume`,
        direction: 'decrease',
      })
    }
  }

  // Cyanuric Acid (stabiliser)
  if (values.cyanuricAcid !== undefined && ranges.cyanuricAcid) {
    const r = ranges.cyanuricAcid
    if (r.max === 0) {
      // Indoor pool — CYA should be zero
      if (values.cyanuricAcid > 5) {
        recs.push({
          parameter: 'Cyanuric Acid',
          currentValue: values.cyanuricAcid,
          targetValue: 0,
          chemical: 'Partial drain and refill',
          dose: `Drain and replace ${Math.round((values.cyanuricAcid / values.cyanuricAcid) * 100)}% of pool`,
          direction: 'decrease',
          notes: 'Cyanuric acid cannot be removed chemically. For indoor pools it should be 0.',
        })
      }
    } else if (values.cyanuricAcid < r.min) {
      const deficit = r.ideal - values.cyanuricAcid
      const kg = ((deficit / 10) * (volKL / 100) * 1.3).toFixed(2)
      recs.push({
        parameter: 'Cyanuric Acid',
        currentValue: values.cyanuricAcid,
        targetValue: r.ideal,
        chemical: 'Stabiliser (Cyanuric Acid / Isocyanuric Acid)',
        dose: `${kg} kg`,
        direction: 'increase',
        notes: 'Dissolve in bucket of warm water. Changes very slowly — re-test after 48 hours.',
      })
    } else if (values.cyanuricAcid > r.max) {
      recs.push({
        parameter: 'Cyanuric Acid',
        currentValue: values.cyanuricAcid,
        targetValue: r.ideal,
        chemical: 'Partial drain and refill',
        dose: `Drain approx ${Math.round(((values.cyanuricAcid - r.ideal) / values.cyanuricAcid) * 100)}% of pool`,
        direction: 'decrease',
        notes: 'Cyanuric acid cannot be chemically removed.',
      })
    }
  }

  return recs
}

export const RISK_COLOURS: Record<RiskLevel, string> = {
  green:  '#00b894',
  yellow: '#fdcb6e',
  orange: '#e17055',
  red:    '#d63031',
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  green:  'Compliant',
  yellow: 'Monitor',
  orange: 'Action Required',
  red:    'Close Pool',
}

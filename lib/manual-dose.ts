// Manual dosing for small bodies of water — an operator measures this into a cylinder or onto
// scales by hand. Every formula is from ACE-2026-SEN-TP-001 (operator training pack) and checked
// against the printed dose chart for a 390 L bath.
//
// Three chemicals are calculated. Two are deliberately NOT, and that is a safety decision:
// acid and soda ash are fixed steps with a dose counter, because a calculated acid dose in
// 390 L is how someone overshoots and pits a stainless vessel.

export interface ManualDose {
  chemical: string
  /** What to measure, already rounded to what a cylinder or scale can actually read. */
  amount: string
  /** Why this dose. */
  reason: string
  /** Shown under the dose — the handling rule that matters most for this chemical. */
  note?: string
  /** A fixed-step dose the operator repeats, rather than one calculated amount. */
  fixed?: boolean
  /** Fixed doses stop after this many attempts, then the operator calls Ace. */
  maxDoses?: number
  severity: 'dose' | 'warn' | 'stop'
}

/** One row of a site's posted dose chart (pool_dose_chart). */
export interface DoseChartRow {
  chemical: string
  product: string
  /** How far the reading moves: mg/L, or pH units for acid. */
  step: number
  amount: number
  unit: string
  plain_terms?: string | null
}

export interface ManualDoseConfig {
  volumeLitres: number
  /** The site's posted chart. Where it has a row for a chemical, the chart wins over the formula. */
  chart?: DoseChartRow[]
  /** One full turnover: how long to circulate before the retest. */
  retestMinutes?: number | null
  /** Grams of dry acid per dose. Never calculated. */
  fixedAcidDoseG?: number | null
  fixedAcidMaxDoses?: number | null
  /** Grams of soda ash per 10 mg/L. Never calculated. */
  fixedSodaAshDoseG?: number | null
  /** How many acid doses have already gone in today, for the cap. */
  acidDosesSoFar?: number
}

export interface ManualDoseTargets {
  freeChlorineIdeal: number
  freeChlorineMin: number
  freeChlorineMax: number
  /** Close the pool above this (the legal maximum). */
  freeChlorineClose?: number | null
  phMin: number
  phMax: number
  alkalinityMin: number
  alkalinityIdeal: number
  phIdeal?: number
  calciumMin?: number | null
  calciumIdeal?: number | null
}

const round1 = (n: number) => Math.round(n * 10) / 10
/**
 * The amount on a posted chart for a change in the reading: a straight line from nothing through
 * each row, carried on at the biggest row's rate past the end, rounded up to the next 5.
 */
export function chartAmount(chartRows: DoseChartRow[], change: number): number {
  const rs = [...chartRows].sort((a, b) => a.step - b.step)
  let prev = { step: 0, amount: 0 }
  for (const r of rs) {
    if (change <= r.step + 1e-9) return ceil5(prev.amount + (r.amount - prev.amount) * (change - prev.step) / (r.step - prev.step))
    prev = r
  }
  return ceil5(change * prev.amount / prev.step)
}

// Up to the next 5 (mL or g), ignoring floating-point dust: 1.4 × 130 is 182, not 185
const ceil5 = (n: number) => Math.ceil(n / 5 - 1e-9) * 5

// Sodium hypochlorite 12.5%: mL = deficit (mg/L) × volume (L) ÷ 125
// Checked: 390 L, raise 1.0 → 3.12 mL. Printed chart says 3.1 mL.
export const hypochloriteMl = (deficitMgL: number, volumeLitres: number) =>
  (deficitMgL * volumeLitres) / 125

// Sodium bicarbonate: g = deficit (mg/L) × volume (L) ÷ 591
// Checked: 390 L, raise 10 → 6.6 g, matching the printed chart. The chart's higher rows are
// about 0.7% lower (it appears to use ÷595); far inside weighing accuracy, so the spec figure stands.
export const bicarbonateG = (deficitMgL: number, volumeLitres: number) =>
  (deficitMgL * volumeLitres) / 591

// Sodium thiosulphate: g = excess (mg/L) × volume (L) ÷ 1170
//
// NOTE, and worth Tony's eye: the build spec gives ÷975, which matches the printed chart's
// 1.0 mg/L row exactly (0.4 g) but is 14-20% HIGHER than its other three rows — the chart's
// 2.0, 3.0 and 5.0 rows sit between ÷1114 and ÷1170. We take ÷1170, the most conservative of
// them, because erring low is the safe direction: thiosulphate does not stop at the target, so
// an overshoot empties the bath of chlorine and it has to be closed. Under-dosing leaves chlorine
// slightly high, which the pack says to leave alone anyway.
export const thiosulphateG = (excessMgL: number, volumeLitres: number) =>
  (excessMgL * volumeLitres) / 1170

export interface ManualDoseInput {
  freeChlorine?: number | null
  totalChlorine?: number | null
  ph?: number | null
  totalAlkalinity?: number | null
  calciumHardness?: number | null
}

/**
 * What to add, by hand, right now. Returns an empty list when everything is in band.
 * The order matters: alkalinity is corrected before chlorine on a refill, and pH is never
 * chased while alkalinity is still low.
 */
export function manualDoses(
  values: ManualDoseInput,
  targets: ManualDoseTargets,
  config: ManualDoseConfig,
): ManualDose[] {
  const out: ManualDose[] = []
  const vol = config.volumeLitres
  if (!vol || vol <= 0) return out

  const { freeChlorine: fc, ph, totalAlkalinity: ta, calciumHardness: ch } = values
  const chart = config.chart ?? []
  const hasChart = chart.length > 0
  const wait = config.retestMinutes ?? 15
  const rows = (c: string) => chart.filter(r => r.chemical === c).sort((a, b) => a.step - b.step)
  // Chart amount per unit of change, read off its largest row (the chart is linear for these).
  const chartRate = (c: string) => {
    const all = rows(c)
    const r = all[all.length - 1]
    return r ? { per: r.amount / r.step, unit: r.unit, product: r.product } : null
  }
  const powderNote = 'Dissolve in a bucket of water first, then pour in. Never tip dry powder into the pool.'

  // A chart site with no bicarbonate row doesn't dose alkalinity at all (AUN)
  const dosesAlkalinity = !hasChart || rows('bicarbonate').length > 0

  // ── Alkalinity first: it is the buffer everything else sits on ────────────
  if (dosesAlkalinity && ta != null && ta < targets.alkalinityMin) {
    const deficit = targets.alkalinityIdeal - ta
    const rate = chartRate('bicarbonate')
    out.push({
      chemical: 'Sodium bicarbonate',
      amount: rate ? `${Math.round(deficit * rate.per)} ${rate.unit}` : `${round1(bicarbonateG(deficit, vol))} g`,
      reason: `Alkalinity ${ta} is below ${targets.alkalinityMin}. Bring it to ${targets.alkalinityIdeal}.`,
      note: `Bicarbonate, not soda ash.${hasChart ? ' ' + powderNote : ''} Circulate ${wait} minutes before adding anything else.`,
      severity: 'dose',
    })
  }

  // ── Calcium hardness (weekly test), only where the chart covers it ───────
  const caRate = chartRate('calcium_chloride')
  if (ch != null && caRate && targets.calciumMin != null && ch < targets.calciumMin) {
    const ideal = targets.calciumIdeal ?? targets.calciumMin
    out.push({
      chemical: caRate.product,
      amount: `${Math.round((ideal - ch) * caRate.per)} ${caRate.unit}`,
      reason: `Calcium hardness ${ch} is below ${targets.calciumMin}. Bring it to ${ideal}.`,
      note: `Gets hot in water. ${powderNote} One chemical at a time: wait ${wait} minutes, then retest.`,
      severity: 'dose',
    })
  }

  // ── Free chlorine ─────────────────────────────────────────────────────────
  if (fc != null) {
    if (fc < targets.freeChlorineMin) {
      const deficit = targets.freeChlorineIdeal - fc
      const rate = chartRate('hypochlorite')
      out.push({
        chemical: rate?.product ?? 'Sodium hypochlorite 12.5%',
        // Chart sites round UP to the next 5 mL, so a cylinder can read it and it never lands short
        amount: rate ? `${ceil5(deficit * rate.per)} ${rate.unit}` : `${round1(hypochloriteMl(deficit, vol))} mL`,
        reason: `Free chlorine ${fc} is below the ${targets.freeChlorineMin} operating floor. Bring it to ${targets.freeChlorineIdeal}.`,
        note: 'Measure into the cylinder labelled CHLORINE. Clear the bath, pour into moving water at the return.',
        severity: 'dose',
      })
    } else if (targets.freeChlorineClose != null && fc > targets.freeChlorineClose) {
      out.push({
        chemical: 'CLOSE the pool',
        amount: 'No dose',
        reason: `Free chlorine ${fc} is above the ${targets.freeChlorineClose} mg/L limit.`,
        note: 'Get everyone out, stop all chlorine dosing and dilute. Do not reopen until it is back under the limit.',
        severity: 'stop',
      })
    } else if (fc > targets.freeChlorineMax) {
      // The pack is explicit: most of the time the right answer is to let it fall or drain.
      out.push({
        chemical: 'Nothing — let it fall',
        amount: 'No dose',
        reason: `Free chlorine ${fc} is above ${targets.freeChlorineMax}. It will fall on its own.`,
        note: hasChart && rows('thiosulphate').length === 0
          ? 'Stop any manual chlorine dosing. Above 10 mg/L close the pool, stop dosing and dilute.'
          : `If it genuinely has to come down now, sodium thiosulphate is ${round1(thiosulphateG(fc - targets.freeChlorineIdeal, vol))} g — dissolve in warm water first. Thiosulphate does not stop at your target, so overshoot and the bath sits at zero.`,
        severity: 'warn',
      })
    }
  }

  // ── pH: from the posted chart or a fixed step, never a formula ────────────
  if (ph != null) {
    if (ph > targets.phMax) {
      const used = config.acidDosesSoFar ?? 0
      const max = config.fixedAcidMaxDoses ?? 2
      const acidRows = rows('acid')
      if (acidRows.length > 0) {
        // The exact amount to bring pH to the target, read off the posted chart: straight
        // line between its rows, and on at the biggest row's rate past the end of it.
        const ideal = targets.phIdeal ?? (targets.phMin + targets.phMax) / 2
        const drop = Math.round((ph - ideal) * 100) / 100
        const row = acidRows[0]
        const amount = chartAmount(acidRows, drop)
        const powder = row.unit === 'g' || row.unit === 'kg'
        // No daily dose cap on a chart site: the amount is worked out to the target each time,
        // so the operator is always told what to add (Tony, 21 Nov 2026)
        out.push({
          chemical: row.product,
          amount: `${amount} ${row.unit}`,
          reason: `pH ${ph} is above ${targets.phMax}. Lower it by ${drop} to ${ideal}.`,
          note: `${powder ? powderNote + ' Never near chlorine.' : 'Acid goes INTO water. Never near chlorine.'} Wait ${wait} minutes, retest.`,
          severity: 'dose',
        })
      } else if (config.fixedAcidDoseG == null) {
        // A site with no fixed step set gets no number at all. Falling back to Senza's 7 g
        // would hand a 16,000 L spa a dose sized for a 390 L bath.
        out.push({
          chemical: 'Acid — use the dose chart at the dosing point',
          amount: 'Per posted chart',
          reason: `pH ${ph} is above ${targets.phMax}. No fixed acid dose is set for this site in Aqua Pro.`,
          note: 'Never calculate acid. If there is no chart, do not dose: call Ace Aquatics on 0422 470 214.',
          severity: 'warn',
        })
      } else if (used >= max) {
        out.push({
          chemical: 'STOP — call Ace Aquatics on 0422 470 214',
          amount: 'No further acid',
          reason: `pH is still ${ph} after ${used} acid doses. That is the cap.`,
          note: 'Do not keep dosing. Acid is the chemical most likely to hurt someone and most likely to damage the baths.',
          severity: 'stop',
        })
      } else {
        out.push({
          chemical: 'Dry acid (sodium bisulphate)',
          amount: `${config.fixedAcidDoseG} g`,
          reason: `pH ${ph} is above ${targets.phMax}. Fixed dose — this is never calculated.`,
          note: `Weigh it on the scales with its own scoop. Circulate ${wait} minutes, retest. Dose ${used + 1} of ${max}.`,
          fixed: true,
          maxDoses: max,
          severity: 'dose',
        })
      }
    } else if (ph < targets.phMin) {
      const lowAlk = dosesAlkalinity && ta != null && ta < targets.alkalinityMin
      const sodaRows = rows('soda_ash')
      if (sodaRows.length > 0 && !lowAlk) {
        const ideal = targets.phIdeal ?? (targets.phMin + targets.phMax) / 2
        const rise = Math.round((ideal - ph) * 100) / 100
        out.push({
          chemical: sodaRows[0].product,
          amount: `${chartAmount(sodaRows, rise)} ${sodaRows[0].unit}`,
          reason: `pH ${ph} is below ${targets.phMin}. Raise it by ${rise} to ${ideal}.`,
          note: `${powderNote} Wait ${wait} minutes, retest.`,
          severity: 'dose',
        })
        return out
      }
      if (hasChart && sodaRows.length === 0) {
        // This site holds no soda ash. Low pH here means the acid doser is overdoing it.
        out.push({
          chemical: lowAlk ? 'Sodium bicarbonate (see above)' : 'No soda ash at this site',
          amount: lowAlk ? 'Fix alkalinity first' : 'No dose',
          reason: `pH ${ph} is below ${targets.phMin}.`,
          note: `Check the Halo Doser is not over-dosing acid${dosesAlkalinity ? ', and that alkalinity is in range' : ''}. Below 7.2 close the pool and call Ace Aquatics on 0422 470 214.`,
          severity: 'warn',
        })
        return out
      }
      out.push({
        chemical: lowAlk ? 'Sodium bicarbonate (see above)' : 'Soda ash (sodium carbonate)',
        amount: lowAlk
          ? 'Fix alkalinity first'
          : config.fixedSodaAshDoseG == null ? 'Per posted chart' : `${config.fixedSodaAshDoseG} g per 10 mg/L`,
        reason: `pH ${ph} is below ${targets.phMin}.`,
        note: lowAlk
          ? 'Alkalinity is low too. Bicarbonate lifts both — correct that first, circulate, then retest pH before reaching for soda ash.'
          : 'Low pH takes soda ash. Low alkalinity takes bicarbonate. Read the label, not the habit.',
        fixed: !lowAlk,
        severity: 'dose',
      })
    }
  }

  return out
}

/**
 * manualDoses() fed straight from a site's own pool_water_targets rows and pool record, so the
 * technician form, the calculator and the client portal all give the same answer for one site.
 */
export function manualDosesForSite(
  values: ManualDoseInput,
  pool: any,
  targets: { parameter: string; min_value: number | null; max_value: number | null; ideal_value: number | null; close_above?: number | null }[],
  acidDosesToday = 0,
  chart: DoseChartRow[] = [],
): ManualDose[] {
  const t = (p: string) => targets.find(x => x.parameter === p)
  const fcT = t('freeChlorine'), phT = t('ph'), taT = t('totalAlkalinity'), caT = t('calciumHardness')
  return manualDoses(
    values,
    {
      freeChlorineIdeal: fcT?.ideal_value ?? 3, freeChlorineMin: fcT?.min_value ?? 2, freeChlorineMax: fcT?.max_value ?? 5,
      freeChlorineClose: fcT?.close_above,
      phMin: phT?.min_value ?? 7.3, phMax: phT?.max_value ?? 7.6,
      alkalinityMin: taT?.min_value ?? 80, alkalinityIdeal: taT?.ideal_value ?? 100,
      phIdeal: phT?.ideal_value ?? undefined,
      calciumMin: caT?.min_value, calciumIdeal: caT?.ideal_value,
    },
    {
      volumeLitres: Number(pool?.volume_litres) || 0,
      chart, retestMinutes: pool?.retest_wait_minutes,
      fixedAcidDoseG: pool?.fixed_acid_dose_g, fixedAcidMaxDoses: pool?.fixed_acid_max_doses,
      fixedSodaAshDoseG: pool?.fixed_soda_ash_dose_g, acidDosesSoFar: acidDosesToday,
    },
  )
}

/** The three rules, shown above every dose so they are never out of sight. */
export const DOSING_RULES = [
  'Test, dose, circulate 15 minutes, retest. Never dose twice without a test in between.',
  'Measure, never estimate. Use the labelled cylinder or scoop for that chemical only.',
  'Never dose with a bather in the bath. Clear it first, every time.',
]

/** The rules with this site's own wait before the retest. */
export const dosingRules = (retestMinutes?: number | null) => retestMinutes && retestMinutes !== 15
  ? [
      `The pump must be running. Test, dose ONE chemical, wait ${retestMinutes} minutes (one turnover), retest.`,
      DOSING_RULES[1],
      'Never dose with anyone in the water. Clear it first, every time.',
    ]
  : DOSING_RULES

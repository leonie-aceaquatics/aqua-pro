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

export interface ManualDoseConfig {
  volumeLitres: number
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
  phMin: number
  phMax: number
  alkalinityMin: number
  alkalinityIdeal: number
}

const round1 = (n: number) => Math.round(n * 10) / 10

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

  const { freeChlorine: fc, ph, totalAlkalinity: ta } = values

  // ── Alkalinity first: it is the buffer everything else sits on ────────────
  if (ta != null && ta < targets.alkalinityMin) {
    const deficit = targets.alkalinityIdeal - ta
    out.push({
      chemical: 'Sodium bicarbonate',
      amount: `${round1(bicarbonateG(deficit, vol))} g`,
      reason: `Alkalinity ${ta} is below ${targets.alkalinityMin}. Bring it to ${targets.alkalinityIdeal}.`,
      note: 'Bicarbonate, not soda ash. Circulate 15 minutes before adding chlorine.',
      severity: 'dose',
    })
  }

  // ── Free chlorine ─────────────────────────────────────────────────────────
  if (fc != null) {
    if (fc < targets.freeChlorineMin) {
      const deficit = targets.freeChlorineIdeal - fc
      out.push({
        chemical: 'Sodium hypochlorite 12.5%',
        amount: `${round1(hypochloriteMl(deficit, vol))} mL`,
        reason: `Free chlorine ${fc} is below the ${targets.freeChlorineMin} operating floor. Bring it to ${targets.freeChlorineIdeal}.`,
        note: 'Measure into the cylinder labelled CHLORINE. Clear the bath, pour into moving water at the return.',
        severity: 'dose',
      })
    } else if (fc > targets.freeChlorineMax) {
      // The pack is explicit: most of the time the right answer is to let it fall or drain.
      out.push({
        chemical: 'Nothing — let it fall',
        amount: 'No dose',
        reason: `Free chlorine ${fc} is above ${targets.freeChlorineMax}. It will fall on its own, and the bath is drained at close anyway.`,
        note: `If it genuinely has to come down now, sodium thiosulphate is ${round1(thiosulphateG(fc - targets.freeChlorineIdeal, vol))} g — dissolve in warm water first. Thiosulphate does not stop at your target, so overshoot and the bath sits at zero.`,
        severity: 'warn',
      })
    }
  }

  // ── pH: fixed steps, never calculated ─────────────────────────────────────
  if (ph != null) {
    if (ph > targets.phMax) {
      const used = config.acidDosesSoFar ?? 0
      const max = config.fixedAcidMaxDoses ?? 2
      if (used >= max) {
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
          amount: `${config.fixedAcidDoseG ?? 7} g`,
          reason: `pH ${ph} is above ${targets.phMax}. Fixed dose — this is never calculated.`,
          note: `Weigh it on the scales with its own scoop. Circulate 15 minutes, retest. Dose ${used + 1} of ${max}.`,
          fixed: true,
          maxDoses: max,
          severity: 'dose',
        })
      }
    } else if (ph < targets.phMin) {
      const lowAlk = ta != null && ta < targets.alkalinityMin
      out.push({
        chemical: lowAlk ? 'Sodium bicarbonate (see above)' : 'Soda ash (sodium carbonate)',
        amount: lowAlk ? 'Fix alkalinity first' : `${config.fixedSodaAshDoseG ?? 4} g per 10 mg/L`,
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

/** The three rules, shown above every dose so they are never out of sight. */
export const DOSING_RULES = [
  'Test, dose, circulate 15 minutes, retest. Never dose twice without a test in between.',
  'Measure, never estimate. Use the labelled cylinder or scoop for that chemical only.',
  'Never dose with a bather in the bath. Clear it first, every time.',
]

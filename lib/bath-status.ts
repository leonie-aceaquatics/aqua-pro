import type { SiteTarget } from '@/lib/water-chemistry'

// Whether a body of water may be open right now, worked out from today's record.
//
// The pre-open round is a gate: a bath does not open until it has been tested and passed. Not
// "we will sort it out at nine". A bath whose latest reading trips a close rule is shut until
// two readings back in target, fifteen minutes apart — and the responsible person decides when
// it actually reopens, which the app records rather than decides.

export type BathState = 'open' | 'not_open_yet' | 'closed'

export interface BathStatus {
  state: BathState
  /** One line an operator can act on. */
  reason: string
  /** Rules currently tripped by the latest reading. */
  closures: string[]
  /** Rounds whose time has passed with nothing recorded. */
  overdue: string[]
  /** Hours since the last reading, when that is longer than the site allows. */
  gapHours: number | null
}

export interface RoundRow { round_key: string; label: string; scheduled_at: string; is_gate: boolean; sort_order: number }

/** Which close rules a reading trips. Empty means the reading is fit to trade on. */
export function closureReasons(test: Record<string, any>, targets: SiteTarget[]): string[] {
  const t = (p: string) => targets.find(x => x.parameter === p)
  const out: string[] = []
  const fc = test.free_chlorine, tc = test.total_chlorine, ph = test.ph
  const cc = test.combined_chlorine

  const fcT = t('freeChlorine'), tcT = t('totalChlorine'), phT = t('ph'), ccT = t('combinedChlorine')
  if (fc != null && fcT?.close_below != null && fc < fcT.close_below) out.push(`Free chlorine ${fc} is below the legal minimum of ${fcT.close_below}`)
  if (tc != null && tcT?.close_above != null && tc > tcT.close_above) out.push(`Total chlorine ${tc} is above the legal maximum of ${tcT.close_above}`)
  if (ph != null && phT?.close_below != null && ph < phT.close_below) out.push(`pH ${ph} is below ${phT.close_below}`)
  if (ph != null && phT?.close_above != null && ph > phT.close_above) out.push(`pH ${ph} is above ${phT.close_above}`)
  if (cc != null && ccT?.close_above != null && cc > ccT.close_above) out.push(`Combined chlorine ${cc} is above ${ccT.close_above}`)
  if (cc != null && fc != null && cc > fc) out.push(`Combined chlorine ${cc} is above the free chlorine ${fc}`)
  if (test.clarity_floor_visible === false) out.push('The floor of the bath is not clearly visible')
  return out
}

export function bathStatus(
  tests: Record<string, any>[],
  rounds: RoundRow[],
  targets: SiteTarget[],
  opts: { maxGapHours?: number | null; now?: Date } = {},
): BathStatus {
  const now = opts.now ?? new Date()
  const ordered = [...tests].sort((a, b) => a.tested_at.localeCompare(b.tested_at))
  const latest = ordered[ordered.length - 1]

  // Rounds whose time has gone by with nothing recorded against them.
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const overdue = rounds.filter(r => {
    const [h, m] = String(r.scheduled_at).split(':').map(Number)
    if (h * 60 + m > minutesNow) return false
    return !tests.some(t => t.round_key === r.round_key && !t.is_retest)
  }).map(r => r.label)

  // How long since anything was recorded, if that is longer than this site allows.
  let gapHours: number | null = null
  if (latest && opts.maxGapHours) {
    const hours = (now.getTime() - new Date(latest.tested_at).getTime()) / 3600000
    if (hours > opts.maxGapHours) gapHours = Math.round(hours * 10) / 10
  }

  const gate = rounds.find(r => r.is_gate)
  const gateDone = gate ? tests.some(t => t.round_key === gate.round_key && !t.is_retest) : true
  if (!gateDone) {
    return { state: 'not_open_yet', reason: `${gate?.label ?? 'The pre-open round'} has not been recorded yet`, closures: [], overdue, gapHours }
  }

  const closures = latest ? closureReasons(latest, targets) : []
  if (closures.length) {
    return { state: 'closed', reason: closures[0], closures, overdue, gapHours }
  }

  return {
    state: 'open',
    reason: gapHours ? `Open, but nothing recorded for ${gapHours} hours` : 'Open',
    closures: [], overdue, gapHours,
  }
}

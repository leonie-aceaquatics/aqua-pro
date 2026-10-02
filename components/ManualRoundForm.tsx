'use client'
import { useState, useMemo } from 'react'
import { CheckCircle, AlertTriangle, Beaker, Users, Eye, Phone, TestTube } from 'lucide-react'
import { manualDoses, DOSING_RULES, type ManualDose } from '@/lib/manual-dose'
import type { SiteTarget } from '@/lib/water-chemistry'

// One round on one body of water, for a manually dosed site.
//
// Shaped around form F1 of the log book: free, total and combined chlorine, pH, temperature,
// clarity and bather count — recorded at the time, per bath, per round. Calcium hardness is
// deliberately absent: the training pack puts that on Ace's weekly panel, not the operator.
//
// The dose panel appears under the readings as they are typed, so the operator sees what to
// measure before they leave the screen. Nothing is calculated for acid or soda ash.

const num = (v: string) => v === '' ? null : Number(v)

const BLANK = {
  free_chlorine: '', total_chlorine: '', ph: '', total_alkalinity: '',
  temperature_c: '', bather_count: '', notes: '',
}

export interface RoundFormProps {
  pool: any
  targets: SiteTarget[]
  roundKey: string
  roundLabel: string
  acidDosesToday: number
  /** Whether the calibration disc has already been run today, and how it went. */
  calibrationToday?: { pass: boolean; at: string } | null
  /** Recording a retest after a dose, rather than a fresh round reading. */
  retestOf?: string | null
  onSaved: () => void
  onCancel: () => void
}

function targetOf(targets: SiteTarget[], p: string) {
  return targets.find(t => t.parameter === p)
}

export default function ManualRoundForm({
  pool, targets, roundKey, roundLabel, acidDosesToday, calibrationToday, retestOf, onSaved, onCancel,
}: RoundFormProps) {
  const [form, setForm] = useState(BLANK)
  const [clear, setClear] = useState<boolean | null>(null)
  const [bathersClear, setBathersClear] = useState(false)
  // The calibration disc runs once a day, before the pre-open round, on the one meter.
  const needsCalibration = roundKey === 'pre_open' && !retestOf && !calibrationToday
  const [calPass, setCalPass] = useState<boolean | null>(null)
  const calFailed = needsCalibration ? calPass === false : calibrationToday?.pass === false
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fc = num(form.free_chlorine), tc = num(form.total_chlorine)
  const ph = num(form.ph), ta = num(form.total_alkalinity)

  // Combined chlorine is always derived. Total − Free.
  const combined = fc != null && tc != null
    ? Math.max(0, Math.round((tc - fc) * 100) / 100)
    : null

  const t = (p: string) => targetOf(targets, p)

  // Close-the-bath rules, straight from the log book's one-line table.
  const closures = useMemo(() => {
    const out: string[] = []
    const fcT = t('freeChlorine'), phT = t('ph'), ccT = t('combinedChlorine'), tcT = t('totalChlorine')
    if (fc != null && fcT?.close_below != null && fc < fcT.close_below) out.push(`Free chlorine ${fc} is below the legal minimum of ${fcT.close_below}`)
    if (tc != null && tcT?.close_above != null && tc > tcT.close_above) out.push(`Total chlorine ${tc} is above the legal maximum of ${tcT.close_above}`)
    if (ph != null && phT?.close_below != null && ph < phT.close_below) out.push(`pH ${ph} is below ${phT.close_below}`)
    if (ph != null && phT?.close_above != null && ph > phT.close_above) out.push(`pH ${ph} is above ${phT.close_above}`)
    if (combined != null && ccT?.close_above != null && combined > ccT.close_above) out.push(`Combined chlorine ${combined} is above ${ccT.close_above}`)
    if (combined != null && fc != null && combined > fc) out.push(`Combined chlorine ${combined} is above the free chlorine ${fc}`)
    if (clear === false) out.push('The floor of the bath is not clearly visible')
    return out
  }, [fc, tc, ph, combined, clear, targets]) // eslint-disable-line react-hooks/exhaustive-deps

  const doses: ManualDose[] = useMemo(() => {
    const fcT = t('freeChlorine'), phT = t('ph'), taT = t('totalAlkalinity')
    if (!fcT || !phT || !taT) return []
    return manualDoses(
      { freeChlorine: fc, totalChlorine: tc, ph, totalAlkalinity: ta },
      {
        freeChlorineIdeal: fcT.ideal_value ?? 3, freeChlorineMin: fcT.min_value ?? 2, freeChlorineMax: fcT.max_value ?? 5,
        phMin: phT.min_value ?? 7.3, phMax: phT.max_value ?? 7.6,
        alkalinityMin: taT.min_value ?? 80, alkalinityIdeal: taT.ideal_value ?? 100,
      },
      {
        volumeLitres: Number(pool.volume_litres) || 0,
        fixedAcidDoseG: pool.fixed_acid_dose_g, fixedAcidMaxDoses: pool.fixed_acid_max_doses,
        fixedSodaAshDoseG: pool.fixed_soda_ash_dose_g, acidDosesSoFar: acidDosesToday,
      },
    )
  }, [fc, tc, ph, ta, targets, pool, acidDosesToday]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/water-tests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pool_id: pool.id, tested_at: new Date().toISOString(),
          round_key: roundKey, is_retest: !!retestOf, retest_of: retestOf ?? null,
          free_chlorine: fc, total_chlorine: tc, ph, total_alkalinity: ta,
          temperature_c: num(form.temperature_c), bather_count: num(form.bather_count),
          clarity_floor_visible: clear, calibration_pass: needsCalibration ? calPass : null,
          notes: form.notes || null,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error ?? 'Could not save this reading.'); setSaving(false); return }
      onSaved()
    } catch {
      setError('No connection — this reading was not saved. Write it on the paper sheet and enter it when you are back online.')
    }
    setSaving(false)
  }

  const label: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }
  const field: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '16px', width: '100%', outline: 'none' }
  const panel: React.CSSProperties = { background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }
  const heading: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }

  const input = (key: keyof typeof BLANK, lbl: string, placeholder: string, step = '0.01') => (
    <div style={{ marginBottom: '12px' }}>
      <label style={label}>{lbl}</label>
      <input type="number" step={step} inputMode="decimal" placeholder={placeholder} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={field} />
    </div>
  )

  return (
    <form onSubmit={submit}>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>{retestOf ? 'Retest' : roundLabel}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
        {pool.name}{retestOf ? ' · after a dose' : ''}
      </div>

      {/* The disc runs before the pre-open round. A fail means the meter is not used and the
          baths do not open on its readings, so there is nothing to record below it. */}
      {needsCalibration && (
        <div style={{ ...panel, border: `1px solid ${calPass === false ? '#d63031' : calPass === true ? '#00b89440' : '#fdcb6e50'}` }}>
          <div style={heading}><TestTube size={13} style={{ verticalAlign: '-2px', marginRight: '5px' }} />Calibration check disc</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
            Run the check disc through the meter before the first round of the day, and record it.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['Pass', true], ['Fail', false]].map(([txt, val]) => (
              <button key={txt as string} type="button" onClick={() => setCalPass(val as boolean)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '700',
                  border: `1px solid ${calPass === val ? (val ? '#00b894' : '#d63031') : 'var(--border)'}`,
                  background: calPass === val ? (val ? '#00b89425' : '#d6303125') : 'var(--surface-2)',
                  color: calPass === val ? (val ? '#00b894' : '#ff7675') : '#94a3b8' }}>{txt as string}</button>
            ))}
          </div>
        </div>
      )}

      {calibrationToday && (
        <div style={{ fontSize: '12px', color: calibrationToday.pass ? '#64748b' : '#ff7675', marginBottom: '12px' }}>
          Calibration disc {calibrationToday.pass ? 'passed' : 'FAILED'} today at{' '}
          {new Date(calibrationToday.at).toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne', hour: '2-digit', minute: '2-digit' })}.
        </div>
      )}

      {calFailed && (
        <div role="alert" style={{ background: '#d6303122', border: '2px solid #d63031', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff7675', fontWeight: '800', fontSize: '15px', marginBottom: '6px' }}>
            <AlertTriangle size={18} /> DO NOT USE THE METER
          </div>
          <div style={{ color: '#e2e8f0', fontSize: '13px' }}>
            The check disc failed, so the readings cannot be trusted and the baths do not open on them.
            Record the failure, then ring Ace Aquatics.
          </div>
          <a href="tel:0422470214" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: '#fff', background: '#d63031', padding: '10px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}>
            <Phone size={15} /> Call Ace 0422 470 214
          </a>
        </div>
      )}

      {!calFailed && (<>
      <div style={panel}>
        <div style={heading}>Chlorine</div>
        {input('free_chlorine', 'Free chlorine (mg/L)', '3.0', '0.01')}
        {input('total_chlorine', 'Total chlorine (mg/L)', '3.2', '0.01')}
        <div style={{ marginBottom: '0' }}>
          <label style={label}>Combined chlorine (mg/L) · auto</label>
          <input type="number" readOnly tabIndex={-1} value={combined ?? ''} placeholder="Total − Free"
            style={{ ...field, background: 'var(--surface-2)', color: '#94a3b8' }} />
        </div>
      </div>

      <div style={panel}>
        <div style={heading}>Balance</div>
        {input('ph', 'pH', '7.45', '0.01')}
        {input('total_alkalinity', 'Total alkalinity (mg/L)', '100', '1')}
        {input('temperature_c', 'Temperature (°C)', '10', '0.1')}
      </div>

      <div style={panel}>
        <div style={heading}>The bath</div>
        <div style={{ marginBottom: '14px' }}>
          <label style={label}><Eye size={12} style={{ verticalAlign: '-2px', marginRight: '4px' }} />Can you clearly see the floor?</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['Yes', true], ['No', false]].map(([txt, val]) => (
              <button key={txt as string} type="button" onClick={() => setClear(val as boolean)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '700',
                  border: `1px solid ${clear === val ? (val ? '#00b894' : '#d63031') : 'var(--border)'}`,
                  background: clear === val ? (val ? '#00b89425' : '#d6303125') : 'var(--surface-2)',
                  color: clear === val ? (val ? '#00b894' : '#ff7675') : '#94a3b8' }}>{txt as string}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={label}><Users size={12} style={{ verticalAlign: '-2px', marginRight: '4px' }} />Bathers since the last round</label>
          <input type="number" step="1" inputMode="numeric" placeholder="0" value={form.bather_count}
            onChange={e => setForm(f => ({ ...f, bather_count: e.target.value }))} style={field} />
        </div>
      </div>

      {/* Close the bath — the log book's red rules */}
      {closures.length > 0 && (
        <div role="alert" style={{ background: '#d6303122', border: '2px solid #d63031', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff7675', fontWeight: '800', fontSize: '15px', marginBottom: '6px' }}>
            <AlertTriangle size={18} /> CLOSE THIS BATH NOW
          </div>
          {closures.map(c => <div key={c} style={{ color: '#e2e8f0', fontSize: '13px', marginBottom: '2px' }}>· {c}</div>)}
          <div style={{ color: '#e2e8f0', fontSize: '13px', marginTop: '8px' }}>
            Get everyone out, put the closure sign on, tell the duty manager. You need nobody&apos;s permission.
            Record it here, do the corrective work, and retest. Shannon decides when it reopens.
          </div>
        </div>
      )}

      {/* What to add */}
      {doses.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid #fdcb6e50', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#fdcb6e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            <Beaker size={13} style={{ verticalAlign: '-2px', marginRight: '5px' }} />What to add
          </div>
          {doses.map((d, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '8px',
              background: d.severity === 'stop' ? '#d6303122' : 'var(--surface-2)',
              border: `1px solid ${d.severity === 'stop' ? '#d63031' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: d.severity === 'stop' ? '#ff7675' : '#e2e8f0' }}>{d.chemical}</span>
                <span style={{ fontSize: '17px', fontWeight: '800', color: d.severity === 'stop' ? '#ff7675' : '#00b4d8' }}>{d.amount}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{d.reason}</div>
              {d.note && <div style={{ fontSize: '12px', color: d.severity === 'stop' ? '#ff7675' : '#fdcb6e', marginTop: '4px' }}>{d.note}</div>}
              {d.severity === 'stop' && (
                <a href="tel:0422470214" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#fff', background: '#d63031', padding: '10px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}>
                  <Phone size={15} /> Call Ace 0422 470 214
                </a>
              )}
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
            {DOSING_RULES.map(r => <div key={r} style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>· {r}</div>)}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={bathersClear} onChange={e => setBathersClear(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#00b894' }} />
            <span style={{ fontSize: '13px', color: '#e2e8f0' }}>The bath is clear of bathers</span>
          </label>
        </div>
      )}

      </>)}

      <div style={{ ...panel, marginBottom: '16px' }}>
        <label style={label}>Notes</label>
        <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Anything unusual. If a round was missed, say so and why." style={{ ...field, fontSize: '14px' }} />
      </div>

      {error && <div style={{ color: '#ff7675', fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ padding: '14px 18px' }}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving || (needsCalibration && calPass === null)}
          style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '15px', background: calFailed ? '#d63031' : undefined }}>
          {saving ? 'Saving…' : calFailed ? <><AlertTriangle size={16} /> Record the failure</> : <><CheckCircle size={16} /> Save reading</>}
        </button>
      </div>
      {doses.length > 0 && (
        <div style={{ fontSize: '12px', color: '#fdcb6e', textAlign: 'center', marginTop: '10px' }}>
          After you dose: circulate 15 minutes, then record a retest. A dose with no retest is the most common reason a record fails.
        </div>
      )}
    </form>
  )
}

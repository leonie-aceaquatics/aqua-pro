'use client'
import { useState, useEffect } from 'react'
import { Calculator } from 'lucide-react'
import { RISK_COLOURS, RISK_LABELS, calculateLSI, classifyLSI, LSI_LABELS } from '@/lib/water-chemistry'
import { CALCULATOR_TIPS, LSI_TIPS } from '@/lib/pool-guide'

const BLANK = { free_chlorine: '', total_chlorine: '', ph: '', total_alkalinity: '', calcium_hardness: '', cyanuric_acid: '', salt_level: '', temperature_c: '' }

// Shared by the admin Chemistry Calculator tab and the technician app (single column, pool preselected).
export default function ChemistryCalculatorTab({ initialPoolId = '', compact = false, onOpenGuide }: { initialPoolId?: string; compact?: boolean; onOpenGuide?: () => void } = {}) {
  const [pools, setPools] = useState<any[]>([])
  const [poolId, setPoolId] = useState(initialPoolId)
  const [values, setValues] = useState(BLANK)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/pools').then(r => r.json()).then(d => setPools(d.pools ?? []))
  }, [])

  // Combined chlorine = total − free (DPD3 − DPD1); shown read-only, recomputed server-side too
  const combinedChlorine = values.free_chlorine !== '' && values.total_chlorine !== ''
    ? Math.max(0, Math.round((Number(values.total_chlorine) - Number(values.free_chlorine)) * 100) / 100).toFixed(2)
    : ''

  // LSI is pool-independent, so it updates live as readings are typed — no pool or Calculate needed.
  // Needs pH, temperature, CH and TA; CYA refines alkalinity and salt stands in for TDS (≥1000 ppm → 12.2 constant).
  const lsi = [values.ph, values.temperature_c, values.calcium_hardness, values.total_alkalinity].every(v => v !== '')
    ? calculateLSI(Number(values.ph), Number(values.temperature_c), Number(values.calcium_hardness), Number(values.total_alkalinity), {
        cyanuricAcid: values.cyanuric_acid !== '' ? Number(values.cyanuric_acid) : undefined,
        tds: values.salt_level !== '' ? Number(values.salt_level) : undefined,
      })
    : null
  const lsiStatus = lsi !== null ? classifyLSI(lsi) : null

  async function calculate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setResult(null)
    const res = await fetch('/api/admin/chemistry-calc', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pool_id: poolId,
        free_chlorine: values.free_chlorine ? Number(values.free_chlorine) : undefined,
        total_chlorine: values.total_chlorine ? Number(values.total_chlorine) : undefined,
        ph: values.ph ? Number(values.ph) : undefined,
        total_alkalinity: values.total_alkalinity ? Number(values.total_alkalinity) : undefined,
        calcium_hardness: values.calcium_hardness ? Number(values.calcium_hardness) : undefined,
        cyanuric_acid: values.cyanuric_acid ? Number(values.cyanuric_acid) : undefined,
        salt_level: values.salt_level ? Number(values.salt_level) : undefined,
        temperature_c: values.temperature_c ? Number(values.temperature_c) : undefined,
      }),
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error ?? 'Calculation failed'); setLoading(false); return }
    setResult(d)
    setLoading(false)
  }

  return (
    <>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '600px', marginBottom: compact ? '16px' : '24px' }}>
        Enter a set of readings for any pool and get an instant dose recommendation and LSI — without logging a full water test. Useful mid-visit, before you've finished a whole reading set.
        {onOpenGuide && <> Stuck? <button type="button" onClick={onOpenGuide} style={{ background: 'none', border: 'none', color: 'var(--aqua)', cursor: 'pointer', padding: 0, fontSize: '13px', textDecoration: 'underline' }}>Open the Pool Chemistry Guide</button>.</>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: compact ? '14px' : '24px', alignItems: 'flex-start' }}>
        <div className="card">
          <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)' }}>
            <Calculator size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Readings
          </div>
          <form onSubmit={calculate}>
            <div style={{ marginBottom: '14px' }}>
              <label>Pool *</label>
              <select required value={poolId} onChange={e => setPoolId(e.target.value)}>
                <option value="">Select pool…</option>
                {pools.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div><label>Free Chlorine (ppm)</label><input type="number" step="0.1" value={values.free_chlorine} onChange={e => setValues(v => ({ ...v, free_chlorine: e.target.value }))} /></div>
              <div><label>Total Chlorine (ppm)</label><input type="number" step="0.1" value={values.total_chlorine} onChange={e => setValues(v => ({ ...v, total_chlorine: e.target.value }))} /></div>
              <div><label>Combined Chlorine (ppm) · auto</label><input type="number" readOnly tabIndex={-1} value={combinedChlorine} placeholder="Total − Free" style={{ color: 'var(--text-muted)' }} /></div>
              <div><label>pH</label><input type="number" step="0.1" value={values.ph} onChange={e => setValues(v => ({ ...v, ph: e.target.value }))} /></div>
              <div><label>Total Alkalinity (ppm)</label><input type="number" value={values.total_alkalinity} onChange={e => setValues(v => ({ ...v, total_alkalinity: e.target.value }))} /></div>
              <div><label>Calcium Hardness (ppm)</label><input type="number" value={values.calcium_hardness} onChange={e => setValues(v => ({ ...v, calcium_hardness: e.target.value }))} /></div>
              <div><label>Cyanuric Acid (ppm)</label><input type="number" value={values.cyanuric_acid} onChange={e => setValues(v => ({ ...v, cyanuric_acid: e.target.value }))} /></div>
              <div><label>Salt Level (ppm)</label><input type="number" value={values.salt_level} onChange={e => setValues(v => ({ ...v, salt_level: e.target.value }))} /></div>
              <div><label>Temperature (°C)</label><input type="number" step="0.1" value={values.temperature_c} onChange={e => setValues(v => ({ ...v, temperature_c: e.target.value }))} /></div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '8px', border: `1px solid ${lsiStatus && lsiStatus !== 'balanced' ? '#e1705540' : 'var(--border)'}`, marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>LSI · auto</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '20px', fontWeight: '700', color: lsiStatus === 'balanced' ? '#00b894' : lsiStatus ? '#e17055' : 'var(--text-dim)' }}>
                  {lsi !== null ? (lsi > 0 ? `+${lsi.toFixed(2)}` : lsi.toFixed(2)) : '—'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {lsiStatus ? LSI_LABELS[lsiStatus] : 'Enter pH, TA, CH and temperature'}
                </span>
              </div>
              {lsiStatus && lsiStatus !== 'balanced' && (
                <div style={{ fontSize: '12px', color: '#fdcb6e', marginTop: '6px', lineHeight: 1.5 }}>{LSI_TIPS[lsiStatus]}</div>
              )}
            </div>
            {error && <div style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>{loading ? 'Calculating…' : 'Calculate'}</button>
          </form>
        </div>

        <div>
          {!result ? (
            <div className="card" style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '48px 20px' }}>
              Enter readings and calculate to see dosing recommendations here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="card">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Risk Level</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: RISK_COLOURS[result.risk.riskLevel as keyof typeof RISK_COLOURS] }}>
                  {RISK_LABELS[result.risk.riskLevel as keyof typeof RISK_LABELS]}
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--text)' }}>
                  Dosing Recommendations
                  <span style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '11px', marginLeft: '8px' }}>
                    ({result.ph_correction_method === 'co2' ? 'CO₂ correction' : 'acid correction'} for this site)
                  </span>
                </div>
                {result.doses.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#00b894' }}>All entered parameters are within range — no dosing needed.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {result.doses.map((d: any, i: number) => (
                      <div key={i} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                          <span>{d.parameter}: {d.currentValue} → {d.targetValue}</span>
                          <span style={{ color: 'var(--aqua)' }}>{d.dose}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{d.chemical}</div>
                        {d.notes && <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>{d.notes}</div>}
                        {CALCULATOR_TIPS[d.parameter] && (
                          <ul style={{ margin: '6px 0 0', paddingLeft: '16px', fontSize: '12px', color: '#fdcb6e', lineHeight: 1.5 }}>
                            {CALCULATOR_TIPS[d.parameter].map((tip, j) => <li key={j}>{tip}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

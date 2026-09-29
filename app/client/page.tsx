'use client'

import { useState, useEffect, useCallback } from 'react'
import { Droplets, LogOut, ChevronRight, HelpCircle, Calculator, ClipboardList, CheckCircle } from 'lucide-react'
import SiteTaskList from '@/components/SiteTaskList'
import ChemistryCalculatorTab from '@/components/ChemistryCalculatorTab'
import InstantAlerts from '@/components/InstantAlerts'
import ChangePassword from '@/components/ChangePassword'
import HelpGuide from '@/components/HelpGuide'
import ReportIssueButton from '@/components/ReportIssueButton'
import { POOL_GUIDE } from '@/lib/pool-guide'
import { RISK_COLOURS, RISK_LABELS, calculateLSI, classifyLSI, LSI_LABELS } from '@/lib/water-chemistry'

// The client portal. A Senza login lands here and sees only their own bodies of water — the API
// scopes every call to their organisation, so this page cannot show anything else even if asked.
//
// Deliberately fewer screens than the technician app: record a round, the dose calculator, the
// site checklist. No site register, no other companies, no roster, no prices.

const BLANK_TEST = {
  free_chlorine: '', combined_chlorine: '', total_chlorine: '', ph: '', total_alkalinity: '',
  calcium_hardness: '', temperature_c: '', turbidity: '', notes: '',
}

export default function ClientPortalPage() {
  const [user, setUser] = useState<any>(null)
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [view, setView] = useState<'tasks' | 'test' | 'calc' | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [tests, setTests] = useState<any[]>([])

  const [form, setForm] = useState(BLANK_TEST)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/admin/pools').then(r => r.json()),
    ]).then(([u, p]) => {
      setUser(u.user)
      setPools(p.pools ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  function openSite(pool: any) {
    setSelected(pool); setView(null); setForm(BLANK_TEST); setSaved(false); setError(null)
    fetch(`/api/admin/water-tests?pool_id=${pool.id}&limit=5`)
      .then(r => r.json()).then(d => setTests(d.tests ?? [])).catch(() => setTests([]))
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  // Combined chlorine and LSI are worked out, never typed.
  const combined = form.free_chlorine !== '' && form.total_chlorine !== ''
    ? Math.max(0, Math.round((Number(form.total_chlorine) - Number(form.free_chlorine)) * 100) / 100).toFixed(2)
    : ''
  const lsi = [form.ph, form.temperature_c, form.calcium_hardness, form.total_alkalinity].every(v => v !== '')
    ? calculateLSI(Number(form.ph), Number(form.temperature_c), Number(form.calcium_hardness), Number(form.total_alkalinity))
    : null
  const lsiStatus = lsi !== null ? classifyLSI(lsi) : null

  async function submitTest(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const payload: Record<string, any> = { pool_id: selected.id, tested_at: new Date().toISOString(), ...form }
    for (const k of Object.keys(BLANK_TEST)) if (payload[k] === '') payload[k] = null
    try {
      const res = await fetch('/api/admin/water-tests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error ?? 'Could not save this test.'); setSaving(false); return }
      setSaved(true); setForm(BLANK_TEST)
      openSite(selected)
    } catch {
      setError('No connection — this test was not saved. Try again when you are back online.')
    }
    setSaving(false)
  }

  const input = (key: keyof typeof BLANK_TEST, label: string, placeholder: string) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <input type="number" step="0.01" placeholder={placeholder} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '16px', width: '100%', outline: 'none' }} />
    </div>
  )

  const panel: React.CSSProperties = { background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }
  const heading: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#00b4d8,#0077b6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💧</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#00b4d8' }}>AquaPro</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{user ? `${user.firstName} ${user.lastName}` : 'by Ace Aquatics'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={() => setShowHelp(true)} title="Pool chemistry guide" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}>
              <HelpCircle size={19} />
            </button>
            <ReportIssueButton />
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* The sites they own */}
      {!selected && (
        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>Your water</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Australia/Melbourne' })}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>Loading…</div>
          ) : pools.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>
              No bodies of water set up yet. Ring Ace Aquatics on 0422 470 214.
            </div>
          ) : pools.map(p => (
            <div key={p.id} onClick={() => openSite(p)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: '#e2e8f0' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {p.volume_litres ? `${Number(p.volume_litres).toLocaleString()} L` : 'Volume not set'}
                </div>
              </div>
              <ChevronRight size={20} color="#64748b" />
            </div>
          ))}
        </div>
      )}

      {/* One body of water */}
      {selected && !view && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => setSelected(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer', marginBottom: '16px' }}>← All water</button>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', marginBottom: '16px' }}>{selected.name}</div>

          {tests[0] && (
            <div style={{ ...panel, border: '1px solid var(--border)' }}>
              <div style={heading}>Last reading</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(tests[0].tested_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: RISK_COLOURS[tests[0].risk_level as keyof typeof RISK_COLOURS] ?? '#64748b' }}>
                  {RISK_LABELS[tests[0].risk_level as keyof typeof RISK_LABELS] ?? ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                {[['FC', tests[0].free_chlorine], ['pH', tests[0].ph], ['TA', tests[0].total_alkalinity]].map(([l, v]) => (
                  <div key={l as string}>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{l}</div>
                    <div style={{ fontWeight: '700', color: '#e2e8f0' }}>{(v as number) ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: '#0077b6' }} onClick={() => setView('tasks')}>
              <ClipboardList size={16} /> Checklist
            </button>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={() => { setSaved(false); setView('test') }}>
              <Droplets size={16} /> Record a reading
            </button>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: '#b8860b' }} onClick={() => setView('calc')}>
              <Calculator size={16} /> Dose calculator
            </button>
          </div>
        </div>
      )}

      {/* Checklist */}
      {selected && view === 'tasks' && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => setView(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer', marginBottom: '16px' }}>← Back</button>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>Checklist</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>{selected.name}</div>
          <SiteTaskList poolId={selected.id} fullScreen />
        </div>
      )}

      {/* Record a reading */}
      {selected && view === 'test' && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => setView(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer', marginBottom: '16px' }}>← Back</button>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>Record a reading</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>{selected.name}</div>

          {saved && (
            <div style={{ background: '#00b89418', border: '1px solid #00b89440', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', color: '#00b894', fontWeight: '700' }}>
              <CheckCircle size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Reading saved
            </div>
          )}

          <form onSubmit={submitTest}>
            <div style={panel}>
              <div style={heading}>Chlorine</div>
              {input('free_chlorine', 'Free chlorine (ppm)', '3.0')}
              {input('total_chlorine', 'Total chlorine (ppm)', '3.2')}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Combined chlorine (ppm) · auto</label>
                <input type="number" readOnly tabIndex={-1} value={combined} placeholder="Total − Free"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#94a3b8', padding: '10px 12px', fontSize: '16px', width: '100%' }} />
              </div>
            </div>

            <div style={panel}>
              <div style={heading}>Balance</div>
              {input('ph', 'pH', '7.4')}
              {input('total_alkalinity', 'Total alkalinity (ppm)', '100')}
              {input('calcium_hardness', 'Calcium hardness (ppm)', '200')}
              {input('temperature_c', 'Temperature (°C)', '12')}
              <InstantAlerts ta={form.total_alkalinity} ch={form.calcium_hardness} volumeLitres={selected.volume_litres} />
              <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '8px', border: `1px solid ${lsiStatus && lsiStatus !== 'balanced' ? '#e1705540' : 'var(--border)'}`, marginTop: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>LSI · auto</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: lsiStatus === 'balanced' ? '#00b894' : lsiStatus ? '#e17055' : '#475569' }}>
                    {lsi !== null ? (lsi > 0 ? `+${lsi.toFixed(2)}` : lsi.toFixed(2)) : '—'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{lsiStatus ? LSI_LABELS[lsiStatus] : 'Enter pH, TA, calcium and temperature'}</span>
                </div>
              </div>
            </div>

            <div style={panel}>
              <div style={heading}>Other</div>
              {input('turbidity', 'Turbidity (NTU)', '0')}
              <div style={{ marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Bather count, clarity, anything unusual"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '14px', width: '100%', outline: 'none' }} />
              </div>
            </div>

            {error && <div style={{ color: '#ff7675', fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}>
              {saving ? 'Saving…' : 'Save reading'}
            </button>
          </form>
        </div>
      )}

      {/* Dose calculator */}
      {selected && view === 'calc' && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => setView(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer', marginBottom: '16px' }}>← Back</button>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '12px' }}>Dose calculator</div>
          <ChemistryCalculatorTab compact initialPoolId={selected.id} />
        </div>
      )}

      {/* Pool chemistry guide */}
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 400, overflowY: 'auto' }}>
          <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button onClick={() => setShowHelp(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer' }}>← Back</button>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#e2e8f0' }}>Pool chemistry</div>
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Ranges, what each chemical does, and what to check when something is out. Anything you are unsure of, ring Ace Aquatics on 0422 470 214.</div>
            <HelpGuide sections={POOL_GUIDE} dark />
            <ChangePassword />
          </div>
        </div>
      )}
    </div>
  )
}

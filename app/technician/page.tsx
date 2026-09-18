'use client'

import { useState, useEffect } from 'react'
import { Droplets, MapPin, CheckCircle, Clock, ChevronRight, LogOut, ClipboardList, FlaskConical, Package, HelpCircle, Camera, Plus, X } from 'lucide-react'
import { RISK_COLOURS, RISK_LABELS, calculateLSI, classifyLSI, LSI_LABELS } from '@/lib/water-chemistry'
import ShiftChecklist from '@/components/ShiftChecklist'
import PlantLog from '@/components/PlantLog'
import SiteTaskList from '@/components/SiteTaskList'
import SiteStockCount from '@/components/SiteStockCount'
import HelpGuide, { TECH_GUIDE } from '@/components/HelpGuide'
import AttachmentPanel from '@/components/AttachmentPanel'
import ReportIssueButton from '@/components/ReportIssueButton'

export default function TechnicianPage() {
  const [user, setUser] = useState<any>(null)
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [showTestForm, setShowTestForm] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [showPlantLog, setShowPlantLog] = useState(false)
  const [showStockCount, setShowStockCount] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [testForm, setTestForm] = useState({
    free_chlorine: '', combined_chlorine: '', total_chlorine: '', ph: '', total_alkalinity: '',
    calcium_hardness: '', cyanuric_acid: '', salt_level: '', phosphates: '',
    temperature_c: '', turbidity: '', notes: '',
    controller_ph: '', controller_fcl: '', calibrate_ph: false, calibrate_fcl: false, fault_report: '',
  })
  const [doses, setDoses] = useState<{ chemical_id: string; quantity: string }[]>([])
  const [chemicals, setChemicals] = useState<any[]>([])
  const [savedTest, setSavedTest] = useState<any>(null)   // just-saved test, for the photo step
  const [saving, setSaving] = useState(false)
  const [lastTest, setLastTest] = useState<any>(null)
  const [loadError, setLoadError] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [completeError, setCompleteError] = useState<string | null>(null)

  const blankTestForm = {
    free_chlorine: '', combined_chlorine: '', total_chlorine: '', ph: '', total_alkalinity: '',
    calcium_hardness: '', cyanuric_acid: '', salt_level: '', phosphates: '',
    temperature_c: '', turbidity: '', notes: '',
    controller_ph: '', controller_fcl: '', calibrate_ph: false, calibrate_fcl: false, fault_report: '',
  }

  function loadShifts() {
    setLoading(true)
    setLoadError(false)
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/technician/today').then(r => r.json()),
    ]).then(([u, s]) => {
      setUser(u.user)
      setShifts(s.shifts ?? [])
      setLoading(false)
    }).catch(() => {
      setLoadError(true)
      setLoading(false)
    })
  }

  useEffect(() => { loadShifts() }, [])
  useEffect(() => { fetch('/api/admin/chemicals').then(r => r.json()).then(d => setChemicals(d.chemicals ?? [])).catch(() => {}) }, [])

  async function loadLastTest(poolId: string) {
    try {
      const res = await fetch(`/api/admin/water-tests?pool_id=${poolId}&limit=1`)
      if (!res.ok) return
      const data = await res.json()
      setLastTest(data.tests?.[0] ?? null)
    } catch { /* last-test panel just won't show — non-critical */ }
  }

  async function handleSelectShift(shift: any) {
    setSelected(shift)
    setLastTest(null)
    if (shift.pool_id) loadLastTest(shift.pool_id)
  }

  async function handleCompleteShift(shiftId: string) {
    setCompleteError(null)
    try {
      const res = await fetch(`/api/technician/shift/${shiftId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', actual_end: new Date().toISOString() }),
      })
      if (!res.ok) { setCompleteError('Could not mark this shift complete — try again.'); return }
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'completed' } : s))
      setSelected(null)
    } catch {
      setCompleteError('No connection — could not mark this shift complete. Try again when back online.')
    }
  }

  async function handleLogTest(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setTestError(null)
    const payload: Record<string, any> = {
      pool_id: selected.pool_id,
      tested_at: new Date().toISOString(),
      ...testForm,
    }
    const numFields = ['free_chlorine','combined_chlorine','total_chlorine','ph','total_alkalinity','calcium_hardness',
      'cyanuric_acid','salt_level','phosphates','temperature_c','turbidity','controller_ph','controller_fcl']
    numFields.forEach(f => { if (payload[f] === '') payload[f] = null })
    payload.doses = doses.filter(d => d.chemical_id && Number(d.quantity) > 0)

    try {
      const res = await fetch('/api/admin/water-tests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setLastTest(data.test)
        setSavedTest(data.test)      // stay on screen for photos; form resets when they tap Done
        setTestForm(blankTestForm)
        setDoses([])
      } else {
        setTestError(data.error ?? 'Could not save this test — try again.')
      }
    } catch {
      setTestError('No connection — this test was not saved. Try again when back online.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const shiftTypeColour: Record<string, string> = {
    service_visit: '#00b4d8', repair: '#e17055', chemical_delivery: '#00b894',
    inspection: '#fdcb6e', office: '#64748b', emergency: '#d63031',
  }

  const numInput = (key: string, label: string, placeholder: string) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <input type="number" step="0.01" placeholder={placeholder}
        value={testForm[key as keyof typeof testForm] as string}
        onChange={e => setTestForm(f => ({ ...f, [key]: e.target.value }))}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '16px', width: '100%', outline: 'none' }}
      />
    </div>
  )

  // Combined chlorine = total - free (DPD3 - DPD1); shown read-only, computed on the server too
  const combinedChlorine = testForm.free_chlorine !== '' && testForm.total_chlorine !== ''
    ? Math.max(0, Math.round((Number(testForm.total_chlorine) - Number(testForm.free_chlorine)) * 100) / 100).toFixed(2)
    : ''

  // LSI = pH + temp + calcium + alkalinity factors − TDS constant; needs all four, CYA refines it
  const lsi = [testForm.ph, testForm.temperature_c, testForm.calcium_hardness, testForm.total_alkalinity].every(v => v !== '')
    ? calculateLSI(Number(testForm.ph), Number(testForm.temperature_c), Number(testForm.calcium_hardness), Number(testForm.total_alkalinity), {
        cyanuricAcid: testForm.cyanuric_acid !== '' ? Number(testForm.cyanuric_acid) : undefined,
      })
    : null
  const lsiStatus = lsi !== null ? classifyLSI(lsi) : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: '480px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#00b4d8,#0077b6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💧</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#00b4d8' }}>AquaPro</div>
              {user && <div style={{ fontSize: '11px', color: '#64748b' }}>{user.firstName} {user.lastName}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={() => setShowHelp(true)} title="How to use AquaPro" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}>
              <HelpCircle size={19} />
            </button>
            <ReportIssueButton />
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>
          Today&apos;s Jobs
        </div>
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Australia/Sydney' })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>Loading shifts…</div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>
            <div style={{ marginBottom: '16px' }}>Couldn&apos;t load today&apos;s jobs — check your connection.</div>
            <button className="btn btn-primary" onClick={loadShifts} style={{ display: 'inline-flex' }}>Retry</button>
          </div>
        ) : shifts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>
            <Clock size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <div>No shifts scheduled for today</div>
          </div>
        ) : shifts.map(shift => (
          <div key={shift.id} onClick={() => handleSelectShift(shift)} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '16px', marginBottom: '12px', cursor: 'pointer',
            opacity: shift.status === 'completed' ? 0.6 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '15px', color: '#e2e8f0', marginBottom: '4px' }}>
                  {shift.pools?.name ?? 'Office / Admin'}
                </div>
                {shift.pools?.address && (
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                    <MapPin size={11} />{shift.pools.address}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '99px',
                    background: shiftTypeColour[shift.shift_type] + '20',
                    color: shiftTypeColour[shift.shift_type],
                    border: `1px solid ${shiftTypeColour[shift.shift_type]}40`,
                  }}>
                    {(shift.shift_type ?? '').replace('_', ' ') || '—'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {new Date(shift.scheduled_start).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' })}
                    {' – '}
                    {new Date(shift.scheduled_end).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' })}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {shift.status === 'completed' ? (
                  <CheckCircle size={20} color="#00b894" />
                ) : (
                  <ChevronRight size={20} color="#64748b" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shift detail / action panel */}
      {selected && !showTestForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ fontWeight: '700', fontSize: '18px', color: '#e2e8f0', marginBottom: '4px' }}>
              {selected.pools?.name ?? 'Admin Shift'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              {selected.pools?.address ?? ''}
            </div>

            {lastTest && (
              <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Test</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {new Date(lastTest.tested_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '99px',
                    background: (RISK_COLOURS[lastTest.risk_level as keyof typeof RISK_COLOURS] ?? '#64748b') + '20',
                    color: RISK_COLOURS[lastTest.risk_level as keyof typeof RISK_COLOURS] ?? '#64748b',
                    border: `1px solid ${RISK_COLOURS[lastTest.risk_level as keyof typeof RISK_COLOURS] ?? '#64748b'}40`,
                  }}>
                    {RISK_LABELS[lastTest.risk_level as keyof typeof RISK_LABELS]}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                  {[['FC', lastTest.free_chlorine, 'ppm'], ['pH', lastTest.ph, ''], ['TA', lastTest.total_alkalinity, 'ppm']].map(([l, v, u]) => (
                    <div key={l as string}>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{l}</div>
                      <div style={{ fontWeight: '700', color: '#e2e8f0' }}>{v ?? '—'}{u}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.pool_id && <SiteTaskList poolId={selected.pool_id} />}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: '#0077b6' }}
                onClick={() => setShowChecklist(true)}>
                <ClipboardList size={16} /> Shift Checklist
              </button>
              {selected.pool_id && (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                  onClick={() => setShowTestForm(true)}>
                  <Droplets size={16} /> Log Water Test
                </button>
              )}
              {selected.pool_id && (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: '#0d6e4e' }}
                  onClick={() => setShowPlantLog(true)}>
                  <FlaskConical size={16} /> Plant Room Log
                </button>
              )}
              {selected.pool_id && (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: '#6c5ce7' }}
                  onClick={() => setShowStockCount(true)}>
                  <Package size={16} /> Count Stock
                </button>
              )}
              {selected.status !== 'completed' && (
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                  onClick={() => handleCompleteShift(selected.id)}>
                  <CheckCircle size={16} /> Mark Complete
                </button>
              )}
              {completeError && (
                <div style={{ color: '#d63031', fontSize: '12px', textAlign: 'center' }}>{completeError}</div>
              )}
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                onClick={() => { setSelected(null); setCompleteError(null) }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved — add photos, then Done */}
      {showTestForm && selected && savedTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300, overflowY: 'auto' }}>
          <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ background: '#00b89418', border: '1px solid #00b89440', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', color: '#00b894', marginBottom: '2px' }}><CheckCircle size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Water test saved</div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                {selected.pools?.name} · {RISK_LABELS[savedTest.risk_level as keyof typeof RISK_LABELS]}
                {savedTest.incident_id ? ' · fault reported to office' : ''}
              </div>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}><Camera size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />Photos of the job</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Optional. Add photos of readings, faults, damage or graffiti. They're attached to this test.</div>
              <AttachmentPanel entityType="water_test" entityId={savedTest.id} />
              {savedTest.incident_id && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#e17055', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Photos of the fault</div>
                  <AttachmentPanel entityType="incident" entityId={savedTest.incident_id} />
                </div>
              )}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}
              onClick={() => { setSavedTest(null); setShowTestForm(false) }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* Water test form */}
      {showTestForm && selected && !savedTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300, overflowY: 'auto' }}>
          <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <button onClick={() => setShowTestForm(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer' }}>
                ← Back
              </button>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#e2e8f0' }}>Log Water Test</div>
            </div>
            <div style={{ marginBottom: '20px', color: '#64748b', fontSize: '13px' }}>{selected.pools?.name}</div>

            <form onSubmit={handleLogTest}>
              <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Sanitiser</div>
                {numInput('free_chlorine', 'Free Chlorine (ppm)', '2.0')}
                {numInput('total_chlorine', 'Total Chlorine (ppm)', '2.5')}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Combined Chlorine (ppm) · auto</label>
                  <input type="number" readOnly tabIndex={-1} value={combinedChlorine} placeholder="Total − Free"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#94a3b8', padding: '10px 12px', fontSize: '16px', width: '100%', outline: 'none' }}
                  />
                </div>
              </div>
              <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Balance</div>
                {numInput('ph', 'pH', '7.4')}
                {numInput('total_alkalinity', 'Total Alkalinity (ppm)', '100')}
                {numInput('calcium_hardness', 'Calcium Hardness (ppm)', '300')}
                <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: `1px solid ${lsiStatus && lsiStatus !== 'balanced' ? '#e1705540' : 'var(--border)'}` }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>LSI · auto</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '20px', fontWeight: '700', color: lsiStatus === 'balanced' ? '#00b894' : lsiStatus ? '#e17055' : '#475569' }}>
                      {lsi !== null ? (lsi > 0 ? `+${lsi.toFixed(2)}` : lsi.toFixed(2)) : '—'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {lsiStatus ? LSI_LABELS[lsiStatus] : 'Enter pH, TA, CH and temperature'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Other</div>
                {numInput('cyanuric_acid', 'CYA (ppm)', '40')}
                {numInput('salt_level', 'Salt (ppm)', '3000')}
                {numInput('temperature_c', 'Temperature (°C)', '28')}
                {numInput('phosphates', 'Phosphates (ppb)', '0')}
                {numInput('turbidity', 'Turbidity (NTU)', '0')}
              </div>

              {/* System screen (Chemtrol, Dulcomarin, etc.): what it says vs what the test says, and whether it was calibrated */}
              <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>System Screen Values</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>What the dosing system / controller screen shows right now (Chemtrol, Dulcomarin, etc). Calibrate if it's out from your test.</div>
                {([['controller_ph', 'ph', 'pH on screen', '7.4', 0.2, 'calibrate_ph'], ['controller_fcl', 'free_chlorine', 'Free Cl on screen (ppm)', '2.0', 0.5, 'calibrate_fcl']] as const).map(([key, manualKey, label, ph, tol, calKey]) => {
                  const ctrl = testForm[key], manual = testForm[manualKey]
                  const diff = ctrl !== '' && manual !== '' ? Number(ctrl) - Number(manual) : null
                  const out = diff !== null && Math.abs(diff) > tol
                  return (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      {numInput(key, label, ph)}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-6px' }}>
                        <span style={{ fontSize: '12px', color: out ? '#e17055' : '#64748b' }}>
                          {diff === null ? 'Enter both to compare' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)} vs your test${out ? ' — calibrate' : ' — OK'}`}
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e2e8f0' }}>
                          <input type="checkbox" checked={testForm[calKey]} onChange={e => setTestForm(f => ({ ...f, [calKey]: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: '#00b894' }} />
                          Calibrated
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Chemicals added by hand at this visit — logged as usage, comes off site stock */}
              <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Chemicals Added (manual dosing)</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Only what you added by hand. Leave empty if the controller did the dosing.</div>
                {doses.map((d, i) => {
                  const chem = chemicals.find(c => c.id === d.chemical_id)
                  return (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <select value={d.chemical_id} onChange={e => setDoses(ds => ds.map((x, j) => j === i ? { ...x, chemical_id: e.target.value } : x))}
                        style={{ flex: 1, minWidth: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px', fontSize: '14px' }}>
                        <option value="">Product…</option>
                        {chemicals.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input type="number" inputMode="decimal" step="0.1" min="0" placeholder="Qty" value={d.quantity}
                        onChange={e => setDoses(ds => ds.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                        style={{ width: '70px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 8px', fontSize: '14px', textAlign: 'center' }} />
                      <span style={{ fontSize: '12px', color: '#64748b', width: '26px' }}>{chem?.dose_unit ?? chem?.unit ?? ''}</span>
                      <button type="button" onClick={() => setDoses(ds => ds.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}><X size={16} /></button>
                    </div>
                  )
                })}
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => setDoses(ds => [...ds, { chemical_id: '', quantity: '' }])}>
                  <Plus size={14} /> Add chemical
                </button>
              </div>

              {/* Faults — becomes an open incident the office sees immediately */}
              <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px', border: `1px solid ${testForm.fault_report ? '#d6303160' : 'transparent'}` }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#e17055', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Faults or Breakdowns</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Anything broken, leaking, alarming or not working. This goes straight to the office as an incident.</div>
                <textarea rows={2} value={testForm.fault_report} onChange={e => setTestForm(f => ({ ...f, fault_report: e.target.value }))} placeholder="e.g. Circulation pump 1 tripping, no flow on feature 3"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '14px', width: '100%', resize: 'vertical' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</label>
                <textarea rows={3} value={testForm.notes} onChange={e => setTestForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '14px', width: '100%', outline: 'none' }}
                />
              </div>
              {testError && (
                <div style={{ color: '#d63031', fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>{testError}</div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit Water Test'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Shift checklist (full-screen step flow) */}
      {showChecklist && selected && (
        <ShiftChecklist
          poolId={selected.pool_id ?? ''}
          poolName={selected.pools?.name ?? 'Shift'}
          shiftId={selected.id}
          staffName={user ? `${user.firstName} ${user.lastName}` : ''}
          onClose={() => setShowChecklist(false)}
          onSubmitted={() => { setShowChecklist(false); setSelected(null) }}
        />
      )}

      {/* Help / instructions */}
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 400, overflowY: 'auto' }}>
          <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button onClick={() => setShowHelp(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer' }}>
                ← Back
              </button>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#e2e8f0' }}>How to use AquaPro</div>
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Tap a heading to open it. If you're stuck, phone the office.</div>
            <HelpGuide sections={TECH_GUIDE} dark />
          </div>
        </div>
      )}

      {/* Site stock count */}
      {showStockCount && selected && (
        <SiteStockCount
          fullScreen
          poolId={selected.pool_id ?? ''}
          poolName={selected.pools?.name ?? ''}
          onClose={() => setShowStockCount(false)}
        />
      )}

      {/* Plant room log */}
      {showPlantLog && selected && (
        <PlantLog
          poolId={selected.pool_id ?? ''}
          poolName={selected.pools?.name ?? 'Plant Room'}
          shiftId={selected.id}
          onClose={() => setShowPlantLog(false)}
          onSubmitted={() => { setShowPlantLog(false); setSelected(null) }}
        />
      )}
    </div>
  )
}

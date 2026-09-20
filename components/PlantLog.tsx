'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, Camera } from 'lucide-react'
import AttachmentPanel from './AttachmentPanel'

type Step = 'pool_condition' | 'maintenance' | 'controller' | 'pumps' | 'dosing' | 'submitted'

const STEPS: Step[] = ['pool_condition', 'maintenance', 'controller', 'pumps', 'dosing']
const STEP_LABELS: Record<Step, string> = {
  pool_condition: 'Pool Condition',
  maintenance: 'Maintenance Tasks',
  controller: 'Controller & Alarms',
  pumps: 'Pumps & Filters',
  dosing: 'Dosing & Submit',
  submitted: 'Submitted',
}

interface Props {
  poolId: string
  poolName: string
  shiftId?: string
  onClose: () => void
  onSubmitted: () => void
}

const sectionTitle = (label: string) => (
  <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{label}</div>
)

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px',
  color: '#e2e8f0', padding: '10px 12px', fontSize: '16px', width: '100%', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px',
  display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px',
}

function BoolRow({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-faint)' }}>
      <span style={{ fontSize: '13px', color: '#94a3b8' }}>{label}</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['Yes', 'No'] as const).map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt === 'Yes')} style={{
            padding: '4px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            background: (opt === 'Yes' ? value === true : value === false) ? (opt === 'Yes' ? '#00b4d820' : '#d6303120') : 'transparent',
            color: (opt === 'Yes' ? value === true : value === false) ? (opt === 'Yes' ? '#00b4d8' : '#d63031') : '#64748b',
            border: `1px solid ${(opt === 'Yes' ? value === true : value === false) ? (opt === 'Yes' ? '#00b4d8' : '#d63031') : 'var(--border)'}`,
          }}>{opt}</button>
        ))}
      </div>
    </div>
  )
}

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, fontSize: '14px' }}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function NumRow({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={labelStyle}>{label}</label>
      <input type="number" step="0.01" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
    </div>
  )
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', background: checked ? '#00b4d810' : 'var(--surface)', border: `1px solid ${checked ? '#00b4d8' : 'var(--border)'}` }}>
      <span style={{ fontSize: '14px', color: '#e2e8f0' }}>{label}</span>
      <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${checked ? '#00b4d8' : '#334155'}`, background: checked ? '#00b4d8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <span style={{ color: '#fff', fontSize: '12px', fontWeight: '900' }}>✓</span>}
      </div>
    </div>
  )
}

export default function PlantLog({ poolId, poolName, shiftId, onClose, onSubmitted }: Props) {
  const [step, setStep] = useState<Step>('pool_condition')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedLogId, setSavedLogId] = useState<string | null>(null)   // just-saved log, for the photo step

  // Pool condition
  const [waterClarity, setWaterClarity] = useState('')
  const [poolFloorChecked, setPoolFloorChecked] = useState<boolean | null>(null)

  // Maintenance
  const [backwash, setBackwash] = useState(false)
  const [backwashMinutes, setBackwashMinutes] = useState('')   // Tony: how long each backwash ran
  const [lintBaskets, setLintBaskets] = useState(false)
  const [sampleLineFilter, setSampleLineFilter] = useState(false)
  const [autoVac, setAutoVac] = useState(false)
  const [dosing, setDosing] = useState(false)

  // Controller
  const [controllerOk, setControllerOk] = useState<boolean | null>(null)
  const [co2Controller, setCo2Controller] = useState('')
  const [gasDetector, setGasDetector] = useState('')
  const [dulcomarinAlarm, setDulcomarinAlarm] = useState<boolean | null>(null)
  const [mechmateAlarm, setMechmateAlarm] = useState<boolean | null>(null)

  // CP1
  const [cp1Status, setCp1Status] = useState('')
  const [cp1GaugeOk, setCp1GaugeOk] = useState<boolean | null>(null)
  const [cp1Pressure, setCp1Pressure] = useState('')
  // CP2
  const [cp2Status, setCp2Status] = useState('')
  const [cp2GaugeOk, setCp2GaugeOk] = useState<boolean | null>(null)
  const [cp2Pressure, setCp2Pressure] = useState('')
  // Heat pump
  const [heatPump, setHeatPump] = useState('')
  const [tempGauge1, setTempGauge1] = useState<boolean | null>(null)
  const [tempGauge2, setTempGauge2] = useState<boolean | null>(null)
  // Filters
  const [filter1, setFilter1] = useState('')
  const [filter2, setFilter2] = useState('')

  // Dosing pumps
  const [chlorinePump, setChlorinePump] = useState('')
  const [acidPump, setAcidPump] = useState('')
  const [generalLeaks, setGeneralLeaks] = useState<boolean | null>(null)
  const [leaksNotes, setLeaksNotes] = useState('')
  // Calibration
  const [calFcl, setCalFcl] = useState(false)
  const [calTcl, setCalTcl] = useState(false)
  const [calPh, setCalPh] = useState(false)
  const [notes, setNotes] = useState('')

  const pumpOptions = [
    { value: 'on_auto', label: 'On / Auto' },
    { value: 'on_manual', label: 'On / Manual' },
    { value: 'off', label: 'Off' },
    { value: 'fault', label: 'Fault' },
  ]

  const dosingOptions = [
    { value: 'on_auto', label: 'On / Auto' },
    { value: 'on_manual', label: 'On / Manual' },
    { value: 'off', label: 'Off' },
    { value: 'external_auto', label: 'External (auto)' },
    { value: 'na', label: 'N/A' },
  ]

  const stepIdx = STEPS.indexOf(step)

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const n = (v: string) => v === '' ? null : parseFloat(v)
    const payload = {
      pool_id: poolId,
      shift_id: shiftId || null,
      logged_at: new Date().toISOString(),
      water_clarity: waterClarity || null,
      pool_floor_checked: poolFloorChecked,
      backwash_done: backwash,
      backwash_minutes: backwash && backwashMinutes !== '' ? Number(backwashMinutes) : null,
      lint_baskets_done: lintBaskets,
      sample_line_filter_done: sampleLineFilter,
      auto_vac_done: autoVac,
      dosing_done: dosing,
      controller_status_ok: controllerOk,
      co2_controller: co2Controller || null,
      gas_detector_co2: gasDetector || null,
      dulcomarin_alarm: dulcomarinAlarm,
      mechmate_alarm: mechmateAlarm,
      cp1_status: cp1Status || null,
      cp1_pressure_gauge_ok: cp1GaugeOk,
      cp1_pressure_psi: n(cp1Pressure),
      cp2_status: cp2Status || null,
      cp2_pressure_gauge_ok: cp2GaugeOk,
      cp2_pressure_psi: n(cp2Pressure),
      heat_pump_status: heatPump || null,
      temp_gauge_1_ok: tempGauge1,
      temp_gauge_2_ok: tempGauge2,
      filter_1_pressure_psi: n(filter1),
      filter_2_pressure_psi: n(filter2),
      chlorine_dosing_pump: chlorinePump || null,
      acid_dosing_pump: acidPump || null,
      general_leaks: generalLeaks,
      general_leaks_notes: leaksNotes || null,
      calibrate_fcl: calFcl,
      calibrate_tcl: calTcl,
      calibrate_ph: calPh,
      notes: notes || null,
    }

    try {
      const res = await fetch('/api/technician/plant-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        setSavedLogId(data.log?.id ?? null)
        setStep('submitted')      // stay on screen for photos; closes when they tap Done
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Could not save this plant log — try again.')
      }
    } catch {
      setError('No connection — this plant log was not saved. Try again when back online.')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'submitted') return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300, overflowY: 'auto' }}>
      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ background: '#00b89418', border: '1px solid #00b89440', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ fontWeight: '700', color: '#00b894', marginBottom: '2px' }}><CheckCircle size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Plant log saved</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>{poolName}</div>
        </div>
        {savedLogId && (
          <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}><Camera size={13} style={{ verticalAlign: '-2px', marginRight: '4px' }} />Photos of the plant room</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Optional. Gauges, controller screen, leaks, alarms, anything the office should see. They're attached to this log.</div>
            <AttachmentPanel entityType="plant_log" entityId={savedLogId} />
          </div>
        )}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }} onClick={onSubmitted}>
          Done
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300, overflowY: 'auto' }}>
      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', paddingBottom: '120px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <button onClick={onClose} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}>✕ Cancel</button>
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#e2e8f0' }}>Plant Room Log</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{poolName}</div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, height: '3px', borderRadius: '99px', background: i <= stepIdx ? '#00b4d8' : 'var(--border)' }} />
          ))}
        </div>
        <div style={{ fontSize: '12px', color: '#00b4d8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px' }}>
          {STEP_LABELS[step]} ({stepIdx + 1}/{STEPS.length})
        </div>

        {/* ── Step 1: Pool Condition ── */}
        {step === 'pool_condition' && (
          <div>
            <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              {sectionTitle('Pool Condition')}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Water Clarity</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[['great', 'Great', '#00b894'], ['good', 'Good', '#00b4d8'], ['fair', 'Fair', '#fdcb6e'], ['concern', 'Concern', '#d63031']].map(([v, l, c]) => (
                    <button key={v} type="button" onClick={() => setWaterClarity(v)} style={{
                      padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                      background: waterClarity === v ? c + '20' : 'var(--surface-2)',
                      color: waterClarity === v ? c : '#64748b',
                      border: `1px solid ${waterClarity === v ? c : 'var(--border)'}`,
                    }}>{l}</button>
                  ))}
                </div>
              </div>
              <BoolRow label="Pool Floor Checked" value={poolFloorChecked} onChange={setPoolFloorChecked} />
            </div>
          </div>
        )}

        {/* ── Step 2: Maintenance Tasks ── */}
        {step === 'maintenance' && (
          <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
            {sectionTitle('Maintenance Tasks Completed')}
            <CheckRow label="Backwash" checked={backwash} onChange={setBackwash} />
            {backwash && (
              <div style={{ margin: '4px 0 10px 28px' }}>
                <NumRow label="How many minutes did you backwash for?" placeholder="3" value={backwashMinutes} onChange={setBackwashMinutes} />
              </div>
            )}
            <CheckRow label="Lint Baskets" checked={lintBaskets} onChange={setLintBaskets} />
            <CheckRow label="Sample Line Filter" checked={sampleLineFilter} onChange={setSampleLineFilter} />
            <CheckRow label="Auto-Vac" checked={autoVac} onChange={setAutoVac} />
            <CheckRow label="Dosing" checked={dosing} onChange={setDosing} />
          </div>
        )}

        {/* ── Step 3: Controller & Alarms ── */}
        {step === 'controller' && (
          <div>
            <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              {sectionTitle('Controller')}
              <BoolRow label="Controller Status OK" value={controllerOk} onChange={setControllerOk} />
              <div style={{ marginTop: '12px' }} />
              <SelectRow label="CO2 Controller" value={co2Controller} onChange={setCo2Controller}
                options={[{ value: 'auto', label: 'Auto' }, { value: 'manual', label: 'Manual' }, { value: 'off', label: 'Off' }]} />
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              {sectionTitle('Alarms & Detectors')}
              <SelectRow label="Gas Detector (CO2)" value={gasDetector} onChange={setGasDetector}
                options={[{ value: 'good', label: 'Good' }, { value: 'alarm', label: 'Alarm' }, { value: 'not_checked', label: 'Not Checked' }]} />
              <BoolRow label="Dulcomarin Alarm" value={dulcomarinAlarm} onChange={setDulcomarinAlarm} />
              <BoolRow label="MechMate Alarm" value={mechmateAlarm} onChange={setMechmateAlarm} />
            </div>
          </div>
        )}

        {/* ── Step 4: Pumps & Filters ── */}
        {step === 'pumps' && (
          <div>
            <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              {sectionTitle('Circulation Pump 1')}
              <SelectRow label="CP1 Status" value={cp1Status} onChange={setCp1Status} options={pumpOptions} />
              <BoolRow label="Pressure Gauge OK" value={cp1GaugeOk} onChange={setCp1GaugeOk} />
              <NumRow label="CP1 Pressure (psi)" placeholder="15" value={cp1Pressure} onChange={setCp1Pressure} />
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              {sectionTitle('Circulation Pump 2')}
              <SelectRow label="CP2 Status" value={cp2Status} onChange={setCp2Status}
                options={[...pumpOptions, { value: 'na', label: 'N/A' }]} />
              <BoolRow label="Pressure Gauge OK" value={cp2GaugeOk} onChange={setCp2GaugeOk} />
              <NumRow label="CP2 Pressure (psi)" placeholder="16" value={cp2Pressure} onChange={setCp2Pressure} />
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              {sectionTitle('Heat Pump & Filters')}
              <SelectRow label="Heat Pump" value={heatPump} onChange={setHeatPump}
                options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }, { value: 'fault', label: 'Fault' }, { value: 'na', label: 'N/A' }]} />
              <BoolRow label="Temp Gauge 1 OK" value={tempGauge1} onChange={setTempGauge1} />
              <BoolRow label="Temp Gauge 2 OK" value={tempGauge2} onChange={setTempGauge2} />
              <div style={{ marginTop: '12px' }} />
              <NumRow label="Filter 1 Pressure (psi)" placeholder="10" value={filter1} onChange={setFilter1} />
              <NumRow label="Filter 2 Pressure (psi)" placeholder="10" value={filter2} onChange={setFilter2} />
            </div>
          </div>
        )}

        {/* ── Step 5: Dosing, Calibration & Submit ── */}
        {step === 'dosing' && (
          <div>
            <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              {sectionTitle('Dosing Pumps')}
              <SelectRow label="Chlorine Dosing Pump" value={chlorinePump} onChange={setChlorinePump} options={dosingOptions} />
              <SelectRow label="Acid Dosing Pump" value={acidPump} onChange={setAcidPump} options={dosingOptions} />
              <BoolRow label="General Leaks" value={generalLeaks} onChange={setGeneralLeaks} />
              {generalLeaks && (
                <div style={{ marginTop: '8px' }}>
                  <label style={labelStyle}>Leak Notes</label>
                  <textarea rows={2} value={leaksNotes} onChange={e => setLeaksNotes(e.target.value)}
                    style={{ ...inputStyle, fontSize: '14px' }} />
                </div>
              )}
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              {sectionTitle('Photometric Calibration Required')}
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Tick if the controller screen differs from your water test by more than about 0.2 pH or 0.5 ppm chlorine.</div>
              <CheckRow label="Calibrate FCL" checked={calFcl} onChange={setCalFcl} />
              <CheckRow label="Calibrate TCL" checked={calTcl} onChange={setCalTcl} />
              <CheckRow label="Calibrate pH" checked={calPh} onChange={setCalPh} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Additional Notes</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                style={{ ...inputStyle, fontSize: '14px' }} />
            </div>
            {error && (
              <div style={{ background: '#d6303120', border: '1px solid #d6303140', borderRadius: '8px', padding: '12px 14px', color: '#fca5a5', fontSize: '13px' }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', gap: '10px' }}>
          {stepIdx > 0 && (
            <button onClick={() => setStep(STEPS[stepIdx - 1])} style={{ flex: 1, padding: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px', fontWeight: '600' }}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step !== 'dosing' ? (
            <button onClick={() => setStep(STEPS[stepIdx + 1])} style={{ flex: 2, padding: '14px', background: '#00b4d8', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px', fontWeight: '700' }}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: '14px', background: '#00b894', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>
              {saving ? 'Saving…' : 'Submit Plant Log'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react'

type Step = 'pre_shift' | 'equipment' | 'sessions' | 'end_of_shift' | 'submitted'

interface Session {
  id?: string
  pool_users: string
  start_time: string
  finish_time: string
  lifeguards_on_shift: string
  lifeguard_names: string[]
  external_staff_on_duty: string
  external_staff_names: string[]
  reporting_required: boolean
  incident_description: string
  rules_observed: boolean
  rules_notes: string
  lane_ropes_replaced: boolean | null
  deck_perimeter_walk: boolean | null
  changerooms_closed: boolean | null
  lights_off: boolean | null
  bumbag_returned: boolean | null
  keys_replaced: boolean | null
  notes: string
  sessionClosed: boolean
}

const blankSession = (): Session => ({
  pool_users: '',
  start_time: '',
  finish_time: '',
  lifeguards_on_shift: '1',
  lifeguard_names: [''],
  external_staff_on_duty: '0',
  external_staff_names: [],
  reporting_required: false,
  incident_description: '',
  rules_observed: true,
  rules_notes: '',
  lane_ropes_replaced: null,
  deck_perimeter_walk: null,
  changerooms_closed: null,
  lights_off: null,
  bumbag_returned: null,
  keys_replaced: null,
  notes: '',
  sessionClosed: false,
})

interface Props {
  poolId: string
  poolName: string
  shiftId?: string
  staffName: string
  onClose: () => void
  onSubmitted: () => void
}

// ── Reusable primitives ────────────────────────────────────────────────────────

function YesNo({
  label, value, onChange, yesLabel = 'Yes', noLabel = 'No',
}: { label: string; value: boolean | null; onChange: (v: boolean) => void; yesLabel?: string; noLabel?: string }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={() => onChange(true)} style={{
          flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
          background: value === true ? '#00b89430' : 'var(--surface-2)',
          color: value === true ? '#00b894' : '#64748b',
          fontWeight: '600', fontSize: '13px',
          outline: value === true ? '1px solid #00b89480' : '1px solid var(--border)',
        }}>{yesLabel}</button>
        <button type="button" onClick={() => onChange(false)} style={{
          flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
          background: value === false ? '#d6303130' : 'var(--surface-2)',
          color: value === false ? '#d63031' : '#64748b',
          fontWeight: '600', fontSize: '13px',
          outline: value === false ? '1px solid #d6303180' : '1px solid var(--border)',
        }}>{noLabel}</button>
      </div>
    </div>
  )
}

function TriChoice({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string; colour: string }[] }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} style={{
            flex: 1, padding: '10px 6px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: value === o.value ? o.colour + '30' : 'var(--surface-2)',
            color: value === o.value ? o.colour : '#64748b',
            fontWeight: '600', fontSize: '12px',
            outline: value === o.value ? `1px solid ${o.colour}80` : '1px solid var(--border)',
          }}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

function TextIn({ label, value, onChange, placeholder = '', type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '14px', width: '100%', outline: 'none' }}
      />
    </div>
  )
}

function Section({ title, children, colour = '#00b4d8' }: { title: string; children: React.ReactNode; colour?: string }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', marginBottom: '14px', border: `1px solid var(--border-faint)` }}>
      <div style={{ fontSize: '11px', fontWeight: '800', color: colour, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>{title}</div>
      {children}
    </div>
  )
}

// ── Step: Pre-Shift ───────────────────────────────────────────────────────────
function PreShiftStep({ form, setForm }: { form: any; setForm: any }) {
  return (
    <>
      <Section title="Pre-Shift Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <TextIn label="Pre-Shift Time" value={form.pre_shift_time} onChange={v => setForm((f: any) => ({ ...f, pre_shift_time: v }))} type="time" />
          <TextIn label="Lifeguards on Duty" value={form.lifeguards_on_duty} onChange={v => setForm((f: any) => ({ ...f, lifeguards_on_duty: v }))} type="number" placeholder="1" />
        </div>
      </Section>

      <Section title="Operational Checks" colour="#00b894">
        <YesNo label="Retrieve Keys" value={form.keys_retrieved} onChange={v => setForm((f: any) => ({ ...f, keys_retrieved: v }))} />
        <YesNo label="Patrol Attendance Log Sign In" value={form.patrol_log_signed} onChange={v => setForm((f: any) => ({ ...f, patrol_log_signed: v }))} />
        <YesNo label="Get Bumbag" value={form.bumbag_retrieved} onChange={v => setForm((f: any) => ({ ...f, bumbag_retrieved: v }))} />
        <YesNo label="Unlock Pool Door" value={form.pool_door_unlocked} onChange={v => setForm((f: any) => ({ ...f, pool_door_unlocked: v }))} />
        <YesNo label="Switch Lights On" value={form.lights_on} onChange={v => setForm((f: any) => ({ ...f, lights_on: v }))} />
        <YesNo label="Open Changerooms" value={form.changerooms_opened} onChange={v => setForm((f: any) => ({ ...f, changerooms_opened: v }))} />
      </Section>

      <Section title="Pool Condition" colour="#fdcb6e">
        <TriChoice
          label="Pool Deck Perimeter Walk"
          value={form.deck_perimeter_walk}
          onChange={v => setForm((f: any) => ({ ...f, deck_perimeter_walk: v }))}
          options={[
            { value: 'all_clear', label: 'All Clear', colour: '#00b894' },
            { value: 'issue', label: 'Issue Found', colour: '#d63031' },
            { value: 'not_done', label: 'Not Done', colour: '#64748b' },
          ]}
        />
        {form.deck_perimeter_walk === 'issue' && (
          <TextIn label="Describe Issue" value={form.deck_perimeter_notes} onChange={v => setForm((f: any) => ({ ...f, deck_perimeter_notes: v }))} placeholder="Describe what was found…" />
        )}
        <TriChoice
          label="Pool Water Clarity"
          value={form.water_clarity}
          onChange={v => setForm((f: any) => ({ ...f, water_clarity: v }))}
          options={[
            { value: 'great', label: 'Great', colour: '#00b894' },
            { value: 'good', label: 'Good', colour: '#00b4d8' },
            { value: 'fair', label: 'Fair', colour: '#fdcb6e' },
            { value: 'concern', label: 'Concern', colour: '#d63031' },
          ]}
        />
        {form.water_clarity === 'concern' && (
          <TextIn label="Water Clarity Notes" value={form.water_clarity_notes} onChange={v => setForm((f: any) => ({ ...f, water_clarity_notes: v }))} placeholder="Describe the issue…" />
        )}
      </Section>
    </>
  )
}

// ── Step: Equipment ───────────────────────────────────────────────────────────
function EquipmentStep({ form, setForm }: { form: any; setForm: any }) {
  return (
    <>
      <Section title="Safety Equipment" colour="#fdcb6e">
        <TextIn label="Date of Last Weekly Check" value={form.last_weekly_safety_check} onChange={v => setForm((f: any) => ({ ...f, last_weekly_safety_check: v }))} type="date" />
        <TriChoice
          label="Safety Equipment Daily Check"
          value={form.safety_equipment_check}
          onChange={v => setForm((f: any) => ({ ...f, safety_equipment_check: v }))}
          options={[
            { value: 'ok', label: 'Daily Check OK', colour: '#00b894' },
            { value: 'fail', label: 'FAIL', colour: '#d63031' },
            { value: 'not_checked', label: 'Not Checked', colour: '#64748b' },
          ]}
        />
        {form.safety_equipment_check === 'fail' && (
          <TextIn label="Safety Equipment Notes" value={form.safety_equipment_notes} onChange={v => setForm((f: any) => ({ ...f, safety_equipment_notes: v }))} placeholder="What was missing or faulty?" />
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <TextIn label="Throw Bags (count)" value={form.throw_bags_count} onChange={v => setForm((f: any) => ({ ...f, throw_bags_count: v }))} type="number" placeholder="3" />
          <TextIn label="Rescue Tubes (count)" value={form.rescue_tubes_count} onChange={v => setForm((f: any) => ({ ...f, rescue_tubes_count: v }))} type="number" placeholder="1" />
        </div>
        <YesNo label="Spine Board Present" value={form.spine_board_present} onChange={v => setForm((f: any) => ({ ...f, spine_board_present: v }))} />
        <YesNo label="First Aid Kit OK" value={form.first_aid_kit_ok} onChange={v => setForm((f: any) => ({ ...f, first_aid_kit_ok: v }))} />
      </Section>

      <Section title="Oxygen Equipment" colour="#00b4d8">
        <TextIn label="Date of Last Weekly Check" value={form.last_weekly_oxygen_check} onChange={v => setForm((f: any) => ({ ...f, last_weekly_oxygen_check: v }))} type="date" />
        <TriChoice
          label="Oxygen Equipment Daily Check"
          value={form.oxygen_equipment_check}
          onChange={v => setForm((f: any) => ({ ...f, oxygen_equipment_check: v }))}
          options={[
            { value: 'ok', label: 'Daily Check OK', colour: '#00b894' },
            { value: 'fail', label: 'FAIL', colour: '#d63031' },
            { value: 'not_checked', label: 'Not Checked', colour: '#64748b' },
          ]}
        />
        {form.oxygen_equipment_check === 'fail' && (
          <TextIn label="Oxygen Equipment Notes" value={form.oxygen_equipment_notes} onChange={v => setForm((f: any) => ({ ...f, oxygen_equipment_notes: v }))} placeholder="Describe the fault…" />
        )}
      </Section>

      <Section title="AED / Defibrillator" colour="#e17055">
        <TextIn label="Date of Last Weekly Check" value={form.last_weekly_aed_check} onChange={v => setForm((f: any) => ({ ...f, last_weekly_aed_check: v }))} type="date" />
        <TriChoice
          label="AED Daily Check"
          value={form.aed_check}
          onChange={v => setForm((f: any) => ({ ...f, aed_check: v }))}
          options={[
            { value: 'ok', label: 'Daily Check OK', colour: '#00b894' },
            { value: 'fail', label: 'FAIL', colour: '#d63031' },
            { value: 'not_checked', label: 'Not Checked', colour: '#64748b' },
          ]}
        />
        <TriChoice
          label="Perform AED Self Test"
          value={form.aed_self_test}
          onChange={v => setForm((f: any) => ({ ...f, aed_self_test: v }))}
          options={[
            { value: 'pass', label: 'PASS', colour: '#00b894' },
            { value: 'fail', label: 'FAIL', colour: '#d63031' },
            { value: 'not_tested', label: 'Not Tested', colour: '#64748b' },
          ]}
        />
        {(form.aed_check === 'fail' || form.aed_self_test === 'fail') && (
          <TextIn label="AED Notes" value={form.aed_notes} onChange={v => setForm((f: any) => ({ ...f, aed_notes: v }))} placeholder="URGENT: describe the fault and action taken…" />
        )}
        {(form.aed_check === 'fail' || form.aed_self_test === 'fail') && (
          <div style={{ background: '#d6303120', border: '1px solid #d6303140', borderRadius: '8px', padding: '12px', color: '#d63031', fontSize: '13px', fontWeight: '600' }}>
            ⚠ AED failure must be reported to management immediately and documented.
          </div>
        )}
      </Section>
    </>
  )
}

// ── Step: Sessions ────────────────────────────────────────────────────────────
function SessionsStep({
  sessions, setSessions, staffName,
}: { sessions: Session[]; setSessions: React.Dispatch<React.SetStateAction<Session[]>>; staffName: string }) {

  function updateSession(idx: number, field: keyof Session, value: any) {
    setSessions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function updateLGName(sessionIdx: number, lgIdx: number, value: string) {
    setSessions(prev => prev.map((s, i) => {
      if (i !== sessionIdx) return s
      const names = [...s.lifeguard_names]
      names[lgIdx] = value
      return { ...s, lifeguard_names: names }
    }))
  }

  function addLG(sessionIdx: number) {
    setSessions(prev => prev.map((s, i) => i === sessionIdx ? { ...s, lifeguard_names: [...s.lifeguard_names, ''] } : s))
  }

  function updateExtStaff(sessionIdx: number, idx: number, value: string) {
    setSessions(prev => prev.map((s, i) => {
      if (i !== sessionIdx) return s
      const names = [...s.external_staff_names]
      names[idx] = value
      return { ...s, external_staff_names: names }
    }))
  }

  function addExtStaff(sessionIdx: number) {
    setSessions(prev => prev.map((s, i) => i === sessionIdx ? { ...s, external_staff_names: [...s.external_staff_names, ''] } : s))
  }

  return (
    <>
      {sessions.map((session, idx) => (
        <div key={idx} style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', marginBottom: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontWeight: '800', color: '#00b4d8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Session {idx + 1}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {sessions.length > 1 && (
                <button type="button" onClick={() => setSessions(prev => prev.filter((_, i) => i !== idx))}
                  style={{ background: '#d6303120', border: 'none', color: '#d63031', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
                  Remove
                </button>
              )}
              <button type="button" onClick={() => updateSession(idx, 'sessionClosed', !session.sessionClosed)}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: '#64748b', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}>
                {session.sessionClosed ? 'Expand' : 'Collapse'}
              </button>
            </div>
          </div>

          {!session.sessionClosed && (
            <>
              {/* Session start */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b894', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Session Start</div>
                <TextIn label="Start Time" value={session.start_time} onChange={v => updateSession(idx, 'start_time', v)} type="time" />
                <TextIn label="Lifeguards on Shift" value={session.lifeguards_on_shift} onChange={v => updateSession(idx, 'lifeguards_on_shift', v)} type="number" placeholder="1" />

                {/* LG names */}
                {session.lifeguard_names.map((name, li) => (
                  <TextIn key={li} label={`Lifeguard ${li + 1}`} value={name} onChange={v => updateLGName(idx, li, v)} placeholder="Full name" />
                ))}
                <button type="button" onClick={() => addLG(idx)} style={{ fontSize: '12px', color: '#00b4d8', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
                  + Add Lifeguard
                </button>

                <TextIn label="Pool Users / Group" value={session.pool_users} onChange={v => updateSession(idx, 'pool_users', v)} placeholder="e.g. ELTHAM College, Public Swim" />
                <TextIn label="External Staff on Duty" value={session.external_staff_on_duty} onChange={v => updateSession(idx, 'external_staff_on_duty', v)} type="number" placeholder="0" />
                {Number(session.external_staff_on_duty) > 0 && (
                  <>
                    {session.external_staff_names.map((name, ei) => (
                      <TextIn key={ei} label={`External Staff ${ei + 1}`} value={name} onChange={v => updateExtStaff(idx, ei, v)} placeholder="Full name" />
                    ))}
                    <button type="button" onClick={() => addExtStaff(idx)} style={{ fontSize: '12px', color: '#00b4d8', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
                      + Add External Staff
                    </button>
                  </>
                )}
              </div>

              {/* Session observations */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#fdcb6e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Observations</div>
                <YesNo label="Rules Observed by Bathers" value={session.rules_observed} onChange={v => updateSession(idx, 'rules_observed', v)} />
                {!session.rules_observed && (
                  <TextIn label="Rules Notes" value={session.rules_notes} onChange={v => updateSession(idx, 'rules_notes', v)} placeholder="What rules were broken?" />
                )}
                <YesNo label="Reporting Required?" value={session.reporting_required} onChange={v => updateSession(idx, 'reporting_required', v)} />
                {session.reporting_required && (
                  <div style={{ background: '#e1705520', border: '1px solid #e1705540', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#e17055', marginBottom: '8px' }}>Incident / Report Details</div>
                    <textarea value={session.incident_description}
                      onChange={e => updateSession(idx, 'incident_description', e.target.value)}
                      placeholder="Describe the incident and actions taken…" rows={4}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px', fontSize: '14px', width: '100%', outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>

              {/* Session end */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#e17055', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Session End</div>
                <TextIn label="Finish Time" value={session.finish_time} onChange={v => updateSession(idx, 'finish_time', v)} type="time" />
                <YesNo label="Replace Lane Ropes" value={session.lane_ropes_replaced} onChange={v => updateSession(idx, 'lane_ropes_replaced', v)} />
                <YesNo label="Pool Deck Perimeter Walk" value={session.deck_perimeter_walk} onChange={v => updateSession(idx, 'deck_perimeter_walk', v)} />
                <YesNo label="Close Changerooms" value={session.changerooms_closed} onChange={v => updateSession(idx, 'changerooms_closed', v)} />
                <YesNo label="Lights Off" value={session.lights_off} onChange={v => updateSession(idx, 'lights_off', v)} />
                <YesNo label="Return Bumbag (to drawer)" value={session.bumbag_returned} onChange={v => updateSession(idx, 'bumbag_returned', v)} />
                <YesNo label="Replace Keys" value={session.keys_replaced} onChange={v => updateSession(idx, 'keys_replaced', v)} />
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Session Notes</label>
                  <textarea value={session.notes} onChange={e => updateSession(idx, 'notes', e.target.value)} rows={2} placeholder="Any other observations…"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px', fontSize: '14px', width: '100%', outline: 'none' }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      <button type="button" onClick={() => setSessions(prev => [...prev, blankSession()])}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '14px', borderRadius: '12px', border: '2px dashed var(--border)', background: 'transparent', color: '#00b4d8', cursor: 'pointer', justifyContent: 'center', fontSize: '14px', fontWeight: '600' }}>
        <Plus size={16} /> Add Session
      </button>
    </>
  )
}

// ── Step: End of Shift ────────────────────────────────────────────────────────
function EndOfShiftStep({ form, setForm }: { form: any; setForm: any }) {
  return (
    <Section title="End of Shift">
      <TextIn label="End of Shift Time" value={form.end_of_shift_time} onChange={v => setForm((f: any) => ({ ...f, end_of_shift_time: v }))} type="time" />
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Additional Notes</label>
        <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any issues or handover notes for the next shift…"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px', fontSize: '14px', width: '100%', outline: 'none' }}
        />
      </div>
    </Section>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ShiftChecklist({ poolId, poolName, shiftId, staffName, onClose, onSubmitted }: Props) {
  const [step, setStep] = useState<Step>('pre_shift')
  const [saving, setSaving] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flags, setFlags] = useState<string[]>([])
  const [checklistId, setChecklistId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([blankSession()])
  const [form, setForm] = useState({
    pre_shift_time: '',
    lifeguards_on_duty: '1',
    keys_retrieved: null as boolean | null,
    patrol_log_signed: null as boolean | null,
    bumbag_retrieved: null as boolean | null,
    pool_door_unlocked: null as boolean | null,
    lights_on: null as boolean | null,
    changerooms_opened: null as boolean | null,
    deck_perimeter_walk: '',
    deck_perimeter_notes: '',
    water_clarity: '',
    water_clarity_notes: '',
    last_weekly_safety_check: '',
    safety_equipment_check: '',
    safety_equipment_notes: '',
    throw_bags_count: '',
    rescue_tubes_count: '',
    spine_board_present: null as boolean | null,
    first_aid_kit_ok: null as boolean | null,
    last_weekly_oxygen_check: '',
    oxygen_equipment_check: '',
    oxygen_equipment_notes: '',
    last_weekly_aed_check: '',
    aed_check: '',
    aed_self_test: '',
    aed_notes: '',
    end_of_shift_time: '',
    notes: '',
  })

  const steps: { id: Step; label: string }[] = [
    { id: 'pre_shift', label: 'Pre-Shift' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'end_of_shift', label: 'End of Shift' },
  ]

  const stepIdx = steps.findIndex(s => s.id === step)

  function buildPayload(status: 'in_progress' | 'completed') {
    return {
      ...(checklistId ? { id: checklistId } : {}),
      pool_id: poolId,
      shift_id: shiftId,
      ...form,
      sessions,
      checklist_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }),
      status,
    }
  }

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/technician/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload('completed')),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setFlags(data.flags ?? [])
        setStep('submitted')
      } else {
        setError(data.error ?? 'Could not submit this checklist — try again.')
      }
    } catch {
      setError('No connection — this checklist was not submitted. Try again when back online.')
    } finally {
      setSaving(false)
    }
  }

  // "Save & Exit" persists the checklist as in_progress (upserting the same row via
  // checklistId) so partially-completed safety data — AED checks, incident notes —
  // is never silently discarded, unlike a plain close that just unmounted this component.
  async function handleSaveAndExit() {
    setExiting(true)
    setError(null)
    try {
      const res = await fetch('/api/technician/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload('in_progress')),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.checklist_id) setChecklistId(data.checklist_id)
        onClose()
      } else {
        setError(data.error ?? 'Could not save your progress — try again before exiting.')
        setExiting(false)
      }
    } catch {
      setError('No connection — your progress was not saved. Try again before exiting.')
      setExiting(false)
    }
  }

  if (step === 'submitted') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#e2e8f0', marginBottom: '8px' }}>Checklist Submitted</div>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>{poolName}</div>
          {flags.length > 0 && (
            <div style={{ background: '#d6303120', border: '1px solid #d6303140', borderRadius: '10px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ fontWeight: '700', color: '#d63031', marginBottom: '8px', fontSize: '13px' }}>
                ⚠ Flags raised — management has been notified
              </div>
              {flags.map(f => <div key={f} style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '4px' }}>• {f}</div>)}
            </div>
          )}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}
            onClick={onSubmitted}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#e2e8f0' }}>Shift Checklist</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{poolName}</div>
          </div>
          <button onClick={handleSaveAndExit} disabled={exiting}
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#94a3b8', padding: '6px 14px', cursor: exiting ? 'default' : 'pointer', fontSize: '12px', opacity: exiting ? 0.6 : 1 }}>
            {exiting ? 'Saving…' : 'Save & Exit'}
          </button>
        </div>
        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {steps.map((s, i) => (
            <div key={s.id} onClick={() => setStep(s.id)} style={{
              flex: 1, padding: '6px 4px', borderRadius: '6px', cursor: 'pointer', textAlign: 'center',
              background: step === s.id ? '#00b4d830' : i < stepIdx ? '#00b89420' : 'var(--surface-2)',
              fontSize: '10px', fontWeight: '700',
              color: step === s.id ? '#00b4d8' : i < stepIdx ? '#00b894' : '#64748b',
            }}>
              {i < stepIdx ? '✓' : ''} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {error && (
          <div style={{ background: '#d6303120', border: '1px solid #d6303140', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', color: '#fca5a5', fontSize: '13px' }}>
            {error}
          </div>
        )}
        {step === 'pre_shift'   && <PreShiftStep form={form} setForm={setForm} />}
        {step === 'equipment'   && <EquipmentStep form={form} setForm={setForm} />}
        {step === 'sessions'    && <SessionsStep sessions={sessions} setSessions={setSessions} staffName={staffName} />}
        {step === 'end_of_shift' && <EndOfShiftStep form={form} setForm={setForm} />}
      </div>

      {/* Footer nav */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '14px 20px', display: 'flex', gap: '10px', flexShrink: 0 }}>
        {stepIdx > 0 && (
          <button onClick={() => setStep(steps[stepIdx - 1].id)} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        {stepIdx < steps.length - 1 ? (
          <button onClick={() => setStep(steps[stepIdx + 1].id)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleSubmit} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '13px', fontSize: '15px' }} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit Checklist'}
          </button>
        )}
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { AlertTriangle, Phone, CheckCircle } from 'lucide-react'

// Form F5 — contamination incident. Someone has been sick in a bath, or there is faecal matter
// or blood in it.
//
// Because these are small bodies of water the response is not hyperchlorination: empty, clean,
// disinfect the surfaces, refill. The fourteen steps are ticked and timed as they are done, so
// the record shows the order they actually happened in rather than being written up afterwards.

const TYPES = ['Diarrhoeal', 'Formed stool', 'Vomit', 'Blood', 'Other'] as const

const STEPS = [
  'Bath closed immediately, bathers cleared, signage placed',
  'Full PPE on before approaching the water',
  'Solid matter removed with a disposable scoop, disposed to sewer — no vacuum',
  'Bath emptied completely',
  'All surfaces scrubbed and rinsed with mains water',
  'Surfaces sprayed with 1:10 chlorine solution (455 mL into 4,545 mL water)',
  'Solution left to soak for 10 minutes',
  'Rinsed thoroughly with mains water',
  'Bath refilled',
  'Free chlorine raised to at least 3.0 mg/L — 9.4 mL from empty',
  'Held at or above 3.0 mg/L for 25 to 30 minutes, pH no higher than 7.5',
  'Cartridge filter cleaned or replaced',
  'Water balance and disinfectant confirmed in range',
  'All contacted tools, equipment and surfaces cleaned and disinfected',
]

const nowTime = () => new Date().toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne', hour: '2-digit', minute: '2-digit' })

export default function ContaminationForm({ pool, onSaved, onCancel }: { pool: any; onSaved: () => void; onCancel: () => void }) {
  const [type, setType] = useState<string>('')
  const [otherType, setOtherType] = useState('')
  const [description, setDescription] = useState('')
  const [done, setDone] = useState<Record<number, string>>({})   // step index → time completed
  const [readings, setReadings] = useState({ free_chlorine: '', total_chlorine: '', ph: '', total_alkalinity: '' })
  const [aceNotified, setAceNotified] = useState(false)
  const [sampleTaken, setSampleTaken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (i: number) => setDone(d => {
    const next = { ...d }
    if (next[i]) delete next[i]; else next[i] = nowTime()
    return next
  })

  const kind = type === 'Other' ? (otherType || 'Other') : type
  const complete = STEPS.every((_, i) => done[i])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!type) { setError('Say what the contamination was.'); return }
    setSaving(true); setError(null)

    const lines = [
      `Contamination: ${kind}`,
      description ? `What happened: ${description}` : null,
      '',
      'Remedial steps:',
      ...STEPS.map((s, i) => `${done[i] ? `[x] ${done[i]}` : '[ ] not done'}  ${s}`),
      '',
      'Readings before reopening:',
      `  Free chlorine ${readings.free_chlorine || '—'} · Total ${readings.total_chlorine || '—'} · pH ${readings.ph || '—'} · Alkalinity ${readings.total_alkalinity || '—'}`,
      '',
      `Ace Aquatics notified: ${aceNotified ? 'yes' : 'no'}`,
      `Water sample taken: ${sampleTaken ? 'yes' : 'no'}`,
      complete ? '' : 'NOTE: not every remedial step was ticked when this was saved.',
    ].filter(l => l !== null).join('\n')

    try {
      const res = await fetch('/api/client/incident', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pool_id: pool.id,
          incident_type: 'water_quality',
          severity: type === 'Diarrhoeal' ? 'critical' : 'high',
          description: lines,
          immediate_action: 'Bath closed, emptied, surfaces disinfected, refilled and re-dosed per the contamination procedure.',
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error ?? 'Could not save this report.'); setSaving(false); return }
      onSaved()
    } catch {
      setError('No connection — this report was not saved. Write it on the paper form and enter it when you are back online.')
    }
    setSaving(false)
  }

  const label: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }
  const field: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '16px', width: '100%', outline: 'none' }
  const panel: React.CSSProperties = { background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }
  const heading: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }

  return (
    <form onSubmit={submit}>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>Something in the water</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>{pool.name}</div>

      <div style={{ background: '#d6303122', border: '2px solid #d63031', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff7675', fontWeight: '800', fontSize: '15px', marginBottom: '6px' }}>
          <AlertTriangle size={18} /> Close the bath first
        </div>
        <div style={{ color: '#e2e8f0', fontSize: '13px' }}>
          Everyone out, signage on, tell the duty manager. Full PPE before you go near the water.
          Tick each step below as you do it — the times are recorded for you.
        </div>
      </div>

      <div style={panel}>
        <div style={heading}>What was it</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: type === 'Other' ? '12px' : '0' }}>
          {TYPES.map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                border: `1px solid ${type === t ? '#d63031' : 'var(--border)'}`,
                background: type === t ? '#d6303125' : 'var(--surface-2)',
                color: type === t ? '#ff7675' : '#94a3b8' }}>{t}</button>
          ))}
        </div>
        {type === 'Other' && (
          <input value={otherType} onChange={e => setOtherType(e.target.value)} placeholder="Describe it" style={field} />
        )}
      </div>

      <div style={panel}>
        <div style={heading}>What happened</div>
        <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
          placeholder="When you found it, who was in the bath, anything else that matters" style={{ ...field, fontSize: '14px' }} />
      </div>

      <div style={panel}>
        <div style={heading}>Remedial steps — tick as you go</div>
        {STEPS.map((step, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 0', borderBottom: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!done[i]} onChange={() => toggle(i)} style={{ width: '20px', height: '20px', accentColor: '#00b894', flexShrink: 0, marginTop: '1px' }} />
            <span style={{ flex: 1, fontSize: '13px', color: done[i] ? '#64748b' : '#e2e8f0', lineHeight: 1.4 }}>{step}</span>
            {done[i] && <span style={{ fontSize: '12px', color: '#00b894', fontWeight: '700', flexShrink: 0 }}>{done[i]}</span>}
          </label>
        ))}
        <div style={{ fontSize: '12px', color: complete ? '#00b894' : '#fdcb6e', marginTop: '10px', fontWeight: '700' }}>
          {Object.keys(done).length} of {STEPS.length} done
        </div>
      </div>

      <div style={panel}>
        <div style={heading}>Readings before reopening</div>
        {([['free_chlorine', 'Free chlorine (mg/L)'], ['total_chlorine', 'Total chlorine (mg/L)'], ['ph', 'pH'], ['total_alkalinity', 'Total alkalinity (mg/L)']] as const).map(([k, l]) => (
          <div key={k} style={{ marginBottom: '12px' }}>
            <label style={label}>{l}</label>
            <input type="number" step="0.01" inputMode="decimal" value={readings[k]}
              onChange={e => setReadings(r => ({ ...r, [k]: e.target.value }))} style={field} />
          </div>
        ))}
      </div>

      <div style={panel}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
          <input type="checkbox" checked={aceNotified} onChange={e => setAceNotified(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#00b894' }} />
          <span style={{ fontSize: '13px', color: '#e2e8f0' }}>Ace Aquatics notified</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={sampleTaken} onChange={e => setSampleTaken(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#00b894' }} />
          <span style={{ fontSize: '13px', color: '#e2e8f0' }}>A water sample was taken</span>
        </label>
        <div style={{ fontSize: '12px', color: '#fdcb6e', marginTop: '10px' }}>
          If this is a big event, or anyone reports getting sick, ring Ace before you drain. Once the water is gone, the option to sample it is gone.
        </div>
        <a href="tel:0422470214" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: '#fff', background: '#d63031', padding: '10px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}>
          <Phone size={15} /> Call Ace 0422 470 214
        </a>
      </div>

      {error && <div style={{ color: '#ff7675', fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ padding: '14px 18px' }}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '15px' }}>
          {saving ? 'Saving…' : <><CheckCircle size={16} /> Save the report</>}
        </button>
      </div>
      {!complete && (
        <div style={{ fontSize: '12px', color: '#fdcb6e', textAlign: 'center', marginTop: '10px' }}>
          You can save before every step is ticked — the report will say which were outstanding. Come back and finish it.
        </div>
      )}
    </form>
  )
}

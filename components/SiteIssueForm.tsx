'use client'
import { useState } from 'react'
import { AlertTriangle, Lightbulb, CheckCircle, Camera } from 'lucide-react'
import AttachmentPanel from '@/components/AttachmentPanel'

// "Something is broken" and "something ought to be done" are different things, and a technician
// should not have to decide which form they are on before they can say either.
//
// A fault goes to the office as an incident straight away. A recommendation is work worth
// quoting for — not urgent, not a failure, and previously homeless, so it stayed in someone's
// head. Photos come after saving, because they attach to the record, and a photo of the thing
// usually argues the job better than the sentence does.

type Kind = 'fault' | 'recommendation'

const URGENCY: { value: string; label: string; hint: string }[] = [
  { value: 'urgent', label: 'Urgent', hint: 'Unsafe or stopping the site running' },
  { value: 'soon', label: 'Soon', hint: 'Will get worse if left' },
  { value: 'when_convenient', label: 'When convenient', hint: 'Worth doing, no rush' },
]

export default function SiteIssueForm({
  pool, onDone,
}: { pool: { id: string; name: string }; onDone: () => void }) {
  const [kind, setKind] = useState<Kind>('fault')
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [urgency, setUrgency] = useState('soon')
  const [saved, setSaved] = useState<{ entity_type: string; id: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Say what it is in a few words.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/technician/site-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool_id: pool.id, kind, title, detail, urgency }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error ?? 'Could not save that.'); setSaving(false); return }
      setSaved({ entity_type: d.entity_type, id: d.id })
    } catch {
      setError('No connection — this was not saved. Try again when you are back online.')
    }
    setSaving(false)
  }

  const field: React.CSSProperties = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '12px', fontSize: '16px', width: '100%', outline: 'none' }
  const label: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }
  const panel: React.CSSProperties = { background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }

  // Saved: the record exists, so photos have something to attach to.
  if (saved) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00b894', fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>
          <CheckCircle size={18} /> Saved
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
          {kind === 'fault' ? 'The office has been told.' : 'This is on the list for the office to price.'} Add photos now — they go in the report with it.
        </div>

        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            <Camera size={14} /> Photos
          </div>
          <AttachmentPanel entityType={saved.entity_type} entityId={saved.id} />
        </div>

        <button type="button" onClick={onDone} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}>
          Done
        </button>
      </>
    )
  }

  return (
    <form onSubmit={submit}>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>Report something</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>{pool.name}</div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {([['fault', 'Something is broken', AlertTriangle, '#d63031'], ['recommendation', 'Recommendation', Lightbulb, '#fdcb6e']] as const).map(([k, lbl, Icon, colour]) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 10px', borderRadius: '10px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '700', textAlign: 'center',
              border: `1px solid ${kind === k ? colour : 'var(--border)'}`,
              background: kind === k ? `${colour}22` : 'var(--surface)',
              color: kind === k ? colour : '#94a3b8' }}>
            <Icon size={20} />{lbl}
          </button>
        ))}
      </div>

      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
        {kind === 'fault'
          ? 'Broken, leaking, not running, unsafe. This goes to the office as soon as you save it.'
          : 'Work worth doing that is not broken yet — wear, a hazard building up, something that would save a callout.'}
      </div>

      <div style={panel}>
        <label style={label}>What is it *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} style={{ ...field, marginBottom: '14px' }}
          placeholder={kind === 'fault' ? 'e.g. Pump 2 not running' : 'e.g. Pool cover rollers seizing'} />

        <label style={label}>Anything else</label>
        <textarea rows={3} value={detail} onChange={e => setDetail(e.target.value)} style={{ ...field, fontSize: '14px' }}
          placeholder={kind === 'fault' ? 'What you saw, what you tried, what you shut off' : 'Why it is worth doing, and what happens if it is left'} />
      </div>

      <div style={panel}>
        <label style={label}>How urgent</label>
        {URGENCY.map(u => (
          <button key={u.value} type="button" onClick={() => setUrgency(u.value)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', marginBottom: '6px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
              border: `1px solid ${urgency === u.value ? '#00b4d8' : 'var(--border)'}`,
              background: urgency === u.value ? '#00b4d822' : 'var(--surface-2)' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: urgency === u.value ? '#00b4d8' : '#e2e8f0', minWidth: '130px' }}>{u.label}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{u.hint}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
        <Camera size={18} color="#00b4d8" style={{ flexShrink: 0, marginTop: '1px' }} />
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
          <span style={{ color: '#e2e8f0', fontWeight: '600' }}>Photos come next.</span> Save this first, then add as many as you like — they go in the report with it.
        </div>
      </div>

      {error && <div style={{ color: '#ff7675', fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onDone} className="btn btn-secondary" style={{ padding: '14px 18px' }}>Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '15px' }}>
          {saving ? 'Saving…' : 'Save and add photos'}
        </button>
      </div>
    </form>
  )
}

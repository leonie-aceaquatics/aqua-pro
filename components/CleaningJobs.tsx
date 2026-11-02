'use client'
import { useState, useEffect, useCallback } from 'react'
import { Camera, CheckCircle, Plus, Sparkles, Trash2 } from 'lucide-react'
import AttachmentPanel from '@/components/AttachmentPanel'
import { CLEANING_JOBS, MAX_CLEANING_PHOTOS, cleaningJobName, type CleaningJobType } from '@/lib/cleaning-jobs'
import { fmtTime } from '@/lib/shift-time'

// Before & After: proof for the client that a clean was done. Pick the job, photograph it BEFORE,
// do the work, come back and photograph it AFTER. A job stays "in progress" in between, so the
// technician can close this screen and do the work. The pair goes in the site visit email.

export default function CleaningJobs({
  pool, shiftId, onDone,
}: { pool: { id: string; name: string }; shiftId: string | null; onDone: () => void }) {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)   // the job being worked on
  const [picking, setPicking] = useState(false)               // choosing a new job
  const [jobType, setJobType] = useState<CleaningJobType | null>(null)
  const [otherLabel, setOtherLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    return fetch(`/api/technician/cleaning?pool_id=${pool.id}`)
      .then(r => r.json())
      .then(d => { setJobs(d.jobs ?? []); setLoading(false) })
      .catch(() => { setError('Could not load — check your connection.'); setLoading(false) })
  }, [pool.id])
  useEffect(() => { load() }, [load])

  async function start() {
    if (!jobType) { setError('Pick what you are cleaning.'); return }
    if (jobType === 'other' && !otherLabel.trim()) { setError('Say what you are cleaning.'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/technician/cleaning', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool_id: pool.id, shift_id: shiftId, job_type: jobType, job_label: otherLabel }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error ?? 'Could not start the job.'); setBusy(false); return }
      setJobs(js => [...js, d.job])
      setOpenId(d.job.id)
      setPicking(false); setJobType(null); setOtherLabel('')
    } catch {
      setError('No connection — the job was not started. Try again when back online.')
    }
    setBusy(false)
  }

  async function setStatus(id: string, action: 'finish' | 'reopen') {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/technician/cleaning', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error ?? 'Could not save.'); setBusy(false); return }
      await load()
      if (action === 'finish') setOpenId(null)
    } catch {
      setError('No connection — try again when back online.')
    }
    setBusy(false)
  }

  async function remove(id: string) {
    setBusy(true); setError(null)
    const res = await fetch(`/api/technician/cleaning?id=${id}`, { method: 'DELETE' }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    if (!res?.ok) setError(d?.error ?? 'Could not delete.')
    else { setOpenId(null); await load() }
    setBusy(false)
  }

  const panel: React.CSSProperties = { background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }
  const heading = (colour: string): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: colour, textTransform: 'uppercase', letterSpacing: '0.5px' })
  const errorLine = error && <div style={{ color: '#ff7675', fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>{error}</div>

  // ── One job: BEFORE photos, do the work, AFTER photos, mark done ──
  const job = jobs.find(j => j.id === openId)
  if (job) {
    const done = job.status === 'done'
    const canFinish = job.before_count > 0 && job.after_count > 0
    return (
      <>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>{cleaningJobName(job)}</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>{pool.name}{done ? ' · done' : ' · in progress'}</div>

        <div style={panel}>
          <div style={heading('#fdcb6e')}><Camera size={14} /> 1. Before — up to {MAX_CLEANING_PHOTOS} photos</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Take these before you start, showing how it looks now.</div>
          <AttachmentPanel entityType="cleaning_before" entityId={job.id} max={MAX_CLEANING_PHOTOS} onChange={load} />
        </div>

        {!done && job.before_count > 0 && job.after_count === 0 && (
          <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginBottom: '12px', lineHeight: 1.5 }}>
            Now do the clean. You can close this screen — the job stays here as <strong style={{ color: '#e2e8f0' }}>in progress</strong> until you add the AFTER photos.
          </div>
        )}

        <div style={{ ...panel, opacity: job.before_count > 0 ? 1 : 0.5 }}>
          <div style={heading('#00b894')}><Camera size={14} /> 2. After — up to {MAX_CLEANING_PHOTOS} photos</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {job.before_count > 0 ? 'Once the work is done, take these from the same spot as the before photos.' : 'Add the BEFORE photos first.'}
          </div>
          {job.before_count > 0 && <AttachmentPanel entityType="cleaning_after" entityId={job.id} max={MAX_CLEANING_PHOTOS} onChange={load} />}
        </div>

        {errorLine}

        {done ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#00b894', fontWeight: '700', marginBottom: '10px' }}>
              <CheckCircle size={18} /> Done {job.finished_at ? `· ${fmtTime(job.finished_at)}` : ''}
            </div>
            <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginBottom: '10px' }}
              disabled={busy} onClick={() => setStatus(job.id, 'reopen')}>
              Not finished after all — reopen
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', marginBottom: '10px', background: canFinish ? '#00b894' : undefined }}
            disabled={busy || !canFinish} onClick={() => setStatus(job.id, 'finish')}>
            <CheckCircle size={16} /> {canFinish ? 'Mark job done' : 'Needs a before AND an after photo'}
          </button>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '14px' }} onClick={() => { setOpenId(null); setError(null) }}>
            ← All jobs
          </button>
          {job.before_count === 0 && job.after_count === 0 && (
            <button type="button" className="btn btn-secondary" style={{ padding: '14px 16px', color: '#ff7675' }} disabled={busy} onClick={() => remove(job.id)}>
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>
      </>
    )
  }

  // ── Choosing a new job ──
  if (picking) {
    return (
      <>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>What are you cleaning?</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>{pool.name}</div>
        <div style={panel}>
          {CLEANING_JOBS.map(j => (
            <button key={j.value} type="button" onClick={() => setJobType(j.value)}
              style={{ display: 'block', width: '100%', padding: '14px', marginBottom: '6px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '15px', fontWeight: '600',
                border: `1px solid ${jobType === j.value ? '#00b4d8' : 'var(--border)'}`,
                background: jobType === j.value ? '#00b4d822' : 'var(--surface-2)',
                color: jobType === j.value ? '#00b4d8' : '#e2e8f0' }}>
              {j.label}
            </button>
          ))}
          {jobType === 'other' && (
            <input autoFocus value={otherLabel} onChange={e => setOtherLabel(e.target.value)} placeholder="e.g. Change room drains"
              style={{ marginTop: '6px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '12px', fontSize: '16px', width: '100%', outline: 'none' }} />
          )}
        </div>
        {errorLine}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" style={{ padding: '14px 18px' }} onClick={() => { setPicking(false); setJobType(null); setError(null) }}>Cancel</button>
          <button type="button" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '15px' }} disabled={busy} onClick={start}>
            {busy ? 'Starting…' : 'Start — take BEFORE photos'}
          </button>
        </div>
      </>
    )
  }

  // ── Today's jobs at this site ──
  return (
    <>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}><Sparkles size={16} style={{ verticalAlign: '-2px', marginRight: '6px', color: '#00b4d8' }} />Before &amp; After</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>{pool.name} · photo proof of cleaning for the client</div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>Loading…</div>
      ) : jobs.length === 0 ? (
        <div style={{ ...panel, fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
          No cleaning jobs here today. Start one <strong style={{ color: '#e2e8f0' }}>before</strong> you clean, so you can take the BEFORE photos first.
        </div>
      ) : jobs.map(j => {
        const done = j.status === 'done'
        return (
          <button key={j.id} type="button" onClick={() => setOpenId(j.id)}
            style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: `1px solid ${done ? '#00b89440' : '#fdcb6e50'}`, borderRadius: '10px', padding: '14px 16px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>{cleaningJobName(j)}</span>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: done ? '#00b894' : '#fdcb6e' }}>{done ? 'Done' : 'In progress'}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {j.staff?.first_name ? `${j.staff.first_name} · ` : ''}{fmtTime(j.started_at)} · 📷 {j.before_count} before · {j.after_count} after
              {!done && j.before_count > 0 && j.after_count === 0 ? ' — tap to add AFTER photos' : ''}
            </div>
          </button>
        )
      })}

      {errorLine}

      <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', margin: '6px 0 10px' }}
        onClick={() => { setPicking(true); setError(null) }}>
        <Plus size={16} /> Start a cleaning job
      </button>
      <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={onDone}>
        Close
      </button>
    </>
  )
}

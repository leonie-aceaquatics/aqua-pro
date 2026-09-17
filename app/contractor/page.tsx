'use client'

import { useState, useEffect } from 'react'
import { Wrench, MapPin, CheckCircle, Clock, LogOut, ChevronRight } from 'lucide-react'
import ReportIssueButton from '@/components/ReportIssueButton'

export default function ContractorPage() {
  const [user, setUser] = useState<any>(null)
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [completeError, setCompleteError] = useState<string | null>(null)

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

  async function handleComplete(shiftId: string, notes: string) {
    setCompleteError(null)
    try {
      const res = await fetch(`/api/technician/shift/${shiftId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', actual_end: new Date().toISOString(), notes }),
      })
      if (!res.ok) { setCompleteError('Could not mark this job complete — try again.'); return }
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'completed' } : s))
      setSelected(null)
    } catch {
      setCompleteError('No connection — could not mark this job complete. Try again when back online.')
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#00b4d8,#0077b6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💧</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#00b4d8' }}>AquaPro</div>
            {user && <div style={{ fontSize: '11px', color: '#64748b' }}>Contractor · {user.firstName} {user.lastName}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ReportIssueButton />
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>My Assignments</div>
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Australia/Sydney' })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>Loading…</div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>
            <div style={{ marginBottom: '16px' }}>Couldn&apos;t load today&apos;s assignments — check your connection.</div>
            <button className="btn btn-primary" onClick={loadShifts} style={{ display: 'inline-flex' }}>Retry</button>
          </div>
        ) : shifts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>
            <Wrench size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <div>No assignments for today</div>
          </div>
        ) : shifts.map(shift => (
          <div key={shift.id} onClick={() => setSelected(shift)} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '16px', marginBottom: '12px', cursor: 'pointer',
            opacity: shift.status === 'completed' ? 0.6 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: '#e2e8f0', marginBottom: '4px' }}>
                  {shift.pools?.name ?? 'Office'}
                </div>
                {shift.pools?.address && (
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <MapPin size={11} />{shift.pools.address}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {new Date(shift.scheduled_start).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' })}
                  {' – '}
                  {new Date(shift.scheduled_end).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' })}
                </div>
              </div>
              {shift.status === 'completed' ? <CheckCircle size={20} color="#00b894" /> : <ChevronRight size={20} color="#64748b" />}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <ContractorSheetPanel
          shift={selected}
          onClose={() => { setSelected(null); setCompleteError(null) }}
          onComplete={handleComplete}
          completeError={completeError}
        />
      )}
    </div>
  )
}

function ContractorSheetPanel({ shift, onClose, onComplete, completeError }: {
  shift: any
  onClose: () => void
  onComplete: (id: string, notes: string) => void
  completeError: string | null
}) {
  const [notes, setNotes] = useState('')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ fontWeight: '700', fontSize: '18px', color: '#e2e8f0', marginBottom: '4px' }}>{shift.pools?.name ?? 'Assignment'}</div>
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>{(shift.shift_type ?? '').replace('_', ' ') || '—'}</div>
        {shift.notes && (
          <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#94a3b8', border: '1px solid var(--border)' }}>
            {shift.notes}
          </div>
        )}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completion Notes</label>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any issues, observations, or work completed…"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px', fontSize: '14px', width: '100%', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {shift.status !== 'completed' && (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
              onClick={() => onComplete(shift.id, notes)}>
              <CheckCircle size={16} /> Mark Complete
            </button>
          )}
          {completeError && (
            <div style={{ color: '#d63031', fontSize: '12px', textAlign: 'center' }}>{completeError}</div>
          )}
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

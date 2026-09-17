'use client'

import { useState } from 'react'
import { Bug, X } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type FeedbackType = 'bug' | 'feature' | 'improvement'
type Priority = 'low' | 'medium' | 'high'

export default function ReportIssueButton({ iconOnly = true }: { iconOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('bug')
  const [priority, setPriority] = useState<Priority>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workaround, setWorkaround] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function reset() {
    setType('bug'); setPriority('medium'); setTitle(''); setDescription('')
    setFile(null); setWorkaround(null); setDone(false); setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError(null)

    let screenshotUrl: string | null = null
    if (file) {
      try {
        const signRes = await fetch('/api/feedback/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name }),
        })
        if (signRes.ok) {
          const { path, token, publicUrl } = await signRes.json()
          const { error } = await supabaseBrowser.storage.from('feedback-screenshots').uploadToSignedUrl(path, token, file)
          if (!error) screenshotUrl = publicUrl
        }
      } catch { /* screenshot is optional — proceed without it */ }
    }

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, title: title.trim(), description, priority,
          page_url: window.location.pathname, screenshot_url: screenshotUrl,
        }),
      })
      if (res.ok) {
        const { diagnosis } = await res.json()
        setWorkaround(diagnosis?.workaround ?? null)
        setDone(true)
      } else {
        setError('Could not submit this report — try again.')
      }
    } catch {
      setError('No connection — this report was not submitted. Try again when back online.')
    } finally {
      setSaving(false)
    }
  }

  function close() {
    setOpen(false)
    reset()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Report an issue"
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <Bug size={18} />
        {!iconOnly && <span style={{ fontSize: '13px' }}>Report an Issue</span>}
      </button>

      {open && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) close() }}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#00b894', marginBottom: '12px' }}>Thanks — reported!</div>
                {workaround && (
                  <div style={{ background: '#00b89418', border: '1px solid #00b89440', borderRadius: '8px', padding: '14px', textAlign: 'left', marginBottom: '16px' }}>
                    <div style={{ color: '#00b894', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Possible workaround while it&apos;s fixed
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '13px' }}>{workaround}</div>
                  </div>
                )}
                <button className="btn btn-primary" onClick={close} style={{ width: '100%', justifyContent: 'center' }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div className="modal-title" style={{ margin: 0 }}>Report an Issue</div>
                  <button onClick={close} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {(['bug', 'feature', 'improvement'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setType(t)}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                          textTransform: 'capitalize', cursor: 'pointer',
                          background: type === t ? '#00b4d820' : 'var(--surface-2)',
                          color: type === t ? '#00b4d8' : '#64748b',
                          border: `1px solid ${type === t ? '#00b4d8' : 'var(--border)'}`,
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label>Title *</label>
                    <input required value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="Short summary of the problem" />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label>What happened?</label>
                    <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Steps to reproduce, what you expected, what happened instead" />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label>Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label>Screenshot (optional)</label>
                    <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  </div>

                  {error && (
                    <div style={{ color: '#d63031', fontSize: '13px', marginBottom: '12px' }}>{error}</div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
                      {saving ? 'Sending…' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

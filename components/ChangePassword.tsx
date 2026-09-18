'use client'
import { useState } from 'react'
import { KeyRound } from 'lucide-react'

// Self-service password change — lives at the bottom of the technician Help screen.
export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (next !== confirm) { setMsg({ ok: false, text: 'The two new passwords do not match.' }); return }
    setSaving(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: current, new_password: next }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { setMsg({ ok: true, text: 'Password changed. Use the new one next time you log in.' }); setCurrent(''); setNext(''); setConfirm('') }
    else setMsg({ ok: false, text: data.error ?? 'Could not change password.' })
    setSaving(false)
  }

  const input: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '16px', width: '100%', outline: 'none' }
  const label: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
      <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>
        <KeyRound size={15} style={{ verticalAlign: '-2px', marginRight: '6px' }} />Change my password
      </div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>Your welcome email had your first password — change it to something only you know.</div>
      <form onSubmit={submit}>
        <div style={{ marginBottom: '12px' }}><label style={label}>Current password</label><input type="password" required autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} style={input} /></div>
        <div style={{ marginBottom: '12px' }}><label style={label}>New password (8+ characters)</label><input type="password" required minLength={8} autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} style={input} /></div>
        <div style={{ marginBottom: '12px' }}><label style={label}>New password again</label><input type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} style={input} /></div>
        {msg && <div style={{ fontSize: '13px', color: msg.ok ? '#00b894' : '#ff7675', marginBottom: '12px' }}>{msg.text}</div>}
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>{saving ? 'Saving…' : 'Change password'}</button>
      </form>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [choose, setChoose] = useState(false)   // admin/manager: pick dashboard or technician app

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Login failed')
      setLoading(false)
      return
    }

    if (data.canChoose) { setChoose(true); setLoading(false); return }
    router.push(data.redirect ?? '/admin')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '40px', height: '40px',
              background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>
              💧
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#00b4d8', letterSpacing: '1px' }}>
              AquaPro
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Pool Maintenance Management
          </div>
        </div>

        {/* Login card */}
        <div className="card">
          {choose ? (
            <>
              <h1 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px', color: 'var(--text)' }}>Where to?</h1>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>You can switch between the two at any time from the menu.</div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', marginBottom: '10px', fontSize: '15px' }} onClick={() => router.push('/admin')}>
                Office dashboard
              </button>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }} onClick={() => router.push('/technician')}>
                Technician app
              </button>
            </>
          ) : (
          <>
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 24px', color: 'var(--text)' }}>
            Sign in
          </h1>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>

            {error && (
              <div style={{
                background: '#d6303120',
                border: '1px solid #d6303140',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--red)',
                marginBottom: '16px',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-dim)' }}>
          AquaPro v1.0 — Secure access only
        </div>
      </div>
    </div>
  )
}

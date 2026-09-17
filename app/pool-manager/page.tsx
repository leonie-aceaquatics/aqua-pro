'use client'

import { useState, useEffect } from 'react'
import { Droplets, AlertTriangle, CheckCircle, Activity, LogOut } from 'lucide-react'
import ReportIssueButton from '@/components/ReportIssueButton'
import { RISK_COLOURS, RISK_LABELS } from '@/lib/water-chemistry'

export default function PoolManagerPage() {
  const [user, setUser] = useState<any>(null)
  const [pool, setPool] = useState<any>(null)
  const [tests, setTests] = useState<any[]>([])
  const [compliance, setCompliance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  function loadData() {
    setLoading(true)
    setLoadError(false)
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/pool-manager/my-pool').then(r => r.json()),
    ]).then(([u, p]) => {
      setUser(u.user)
      setPool(p.pool)
      setTests(p.recentTests ?? [])
      setCompliance(p.compliance ?? [])
      setLoading(false)
    }).catch(() => {
      setLoadError(true)
      setLoading(false)
    })
  }

  useEffect(() => { loadData() }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const latestTest = tests[0]
  const riskColour = RISK_COLOURS[latestTest?.risk_level as keyof typeof RISK_COLOURS] ?? '#64748b'
  const riskLabel = RISK_LABELS[latestTest?.risk_level as keyof typeof RISK_LABELS] ?? 'No data'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#00b4d8,#0077b6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💧</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#00b4d8' }}>AquaPro</div>
            {pool && <div style={{ fontSize: '11px', color: '#64748b' }}>{pool.name}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && <span style={{ fontSize: '13px', color: '#64748b' }}>{user.firstName} {user.lastName}</span>}
          <ReportIssueButton />
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>Loading…</div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>
            <div style={{ marginBottom: '16px' }}>Couldn&apos;t load your pool status — check your connection.</div>
            <button className="btn btn-primary" onClick={loadData} style={{ display: 'inline-flex' }}>Retry</button>
          </div>
        ) : !pool ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>No pool assigned to your account. Contact the administrator.</div>
        ) : (
          <>
            {/* Current risk status hero */}
            <div style={{
              background: riskColour + '15',
              border: `1px solid ${riskColour}40`,
              borderRadius: '14px', padding: '24px', marginBottom: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Current Water Status</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: riskColour }}>{riskLabel}</div>
                {latestTest && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Last tested: {new Date(latestTest.tested_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
                  </div>
                )}
              </div>
              {latestTest?.risk_level === 'red' ? (
                <AlertTriangle size={40} color={riskColour} />
              ) : (
                <Droplets size={40} color={riskColour} />
              )}
            </div>

            {/* Latest parameters */}
            {latestTest && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Latest Readings</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))', gap: '10px' }}>
                  {[
                    ['Free Chlorine', latestTest.free_chlorine, 'ppm', 1.0, 3.0],
                    ['pH', latestTest.ph, '', 7.2, 7.6],
                    ['Total Alkalinity', latestTest.total_alkalinity, 'ppm', 80, 120],
                    ['Calcium Hardness', latestTest.calcium_hardness, 'ppm', 200, 400],
                    ['CYA', latestTest.cyanuric_acid, 'ppm', 30, 50],
                    ['Temperature', latestTest.temperature_c, '°C', null, null],
                  ].filter(([,v]) => v !== null && v !== undefined).map(([label, val, unit, min, max]) => {
                    const isOut = min !== null && max !== null && (Number(val) < Number(min) || Number(val) > Number(max))
                    return (
                      <div key={label as string} style={{
                        background: 'var(--surface)', borderRadius: '10px', padding: '14px',
                        border: `1px solid ${isOut ? '#d6303140' : 'var(--border)'}`,
                      }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>{label as string}</div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: isOut ? '#d63031' : '#e2e8f0' }}>
                          {val as string}{unit as string}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Compliance items */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Compliance</div>
              {compliance.length === 0 ? (
                <div style={{ color: '#64748b', padding: '16px' }}>No compliance events scheduled</div>
              ) : compliance.map((ev: any) => {
                const overdue = !!ev.due_date && new Date(ev.due_date) < new Date() && ev.status !== 'completed'
                return (
                  <div key={ev.id} style={{
                    background: 'var(--surface)', border: `1px solid ${overdue ? '#d6303140' : 'var(--border)'}`,
                    borderRadius: '10px', padding: '14px', marginBottom: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '2px' }}>{ev.event_type}</div>
                      <div style={{ fontSize: '12px', color: overdue ? '#d63031' : '#64748b' }}>
                        Due: {ev.due_date}
                        {overdue && ' — OVERDUE'}
                      </div>
                    </div>
                    {ev.status === 'completed'
                      ? <CheckCircle size={18} color="#00b894" />
                      : <Activity size={18} color={overdue ? '#d63031' : '#00b4d8'} />
                    }
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

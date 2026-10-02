'use client'

import { useState, useEffect, useCallback } from 'react'
import { Droplets, LogOut, ChevronRight, HelpCircle, Calculator, ClipboardList, CheckCircle, Clock, RotateCcw, AlertTriangle } from 'lucide-react'
import SiteTaskList from '@/components/SiteTaskList'
import ManualDoseCalculator from '@/components/ManualDoseCalculator'
import ContaminationForm from '@/components/ContaminationForm'
import ChangePassword from '@/components/ChangePassword'
import HelpGuide from '@/components/HelpGuide'
import ReportIssueButton from '@/components/ReportIssueButton'
import { POOL_GUIDE, MANUAL_POOL_GUIDE } from '@/lib/pool-guide'
import { RISK_COLOURS, RISK_LABELS } from '@/lib/water-chemistry'
import ManualRoundForm from '@/components/ManualRoundForm'

// The client portal. A Senza login lands here and sees only their own bodies of water — the API
// scopes every call to their organisation, so this page cannot show anything else even if asked.
//
// Deliberately fewer screens than the technician app: record a round, the dose calculator, the
// site checklist. No site register, no other companies, no roster, no prices.


export default function ClientPortalPage() {
  const [user, setUser] = useState<any>(null)
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [view, setView] = useState<'tasks' | 'test' | 'calc' | 'contam' | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [tests, setTests] = useState<any[]>([])

  const [site, setSite] = useState<any>(null)          // targets, rounds, today's entries
  const [round, setRound] = useState<{ key: string; label: string; retestOf?: string } | null>(null)

  // Hand-dosed sites get the guide written for them: no controllers, probes, backwash or salt,
  // because none of that exists at a bath like this.
  const manualSite = pools.length > 0 && pools.every((p: any) => p.dosing_type === 'manual')

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/client/overview').then(r => r.json()),
    ]).then(([u, p]) => {
      setUser(u.user)
      setPools(p.pools ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const loadSite = useCallback((poolId: string) => {
    fetch(`/api/client/site?pool_id=${poolId}`)
      .then(r => r.json()).then(d => { setSite(d); setTests(d.tests ?? []) })
      .catch(() => { setSite(null); setTests([]) })
  }, [])

  function openSite(pool: any) {
    setSelected(pool); setView(null); setRound(null); setSite(null)
    loadSite(pool.id)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const panel: React.CSSProperties = { background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }
  const heading: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#00b4d8,#0077b6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💧</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#00b4d8' }}>AquaPro</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{user ? `${user.firstName} ${user.lastName}` : 'by Ace Aquatics'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={() => setShowHelp(true)} title="Pool chemistry guide" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}>
              <HelpCircle size={19} />
            </button>
            <ReportIssueButton />
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* The sites they own */}
      {!selected && (
        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>Your water</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Australia/Melbourne' })}
          </div>

          {!loading && pools.length > 0 && pools.some((p: any) => p.status?.state !== 'open') && (
            <div style={{ background: '#fdcb6e18', border: '1px solid #fdcb6e55', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ color: '#fdcb6e', fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>
                {pools.filter((p: any) => p.status?.state !== 'open').length} of {pools.length} not open
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '13px' }}>
                A body of water does not open until its pre-open round has been recorded and passed.
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>Loading…</div>
          ) : pools.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>
              No bodies of water set up yet. Ring Ace Aquatics on 0422 470 214.
            </div>
          ) : pools.map(p => {
            const st = p.status
            const colour = st?.state === 'open' ? '#00b894' : st?.state === 'closed' ? '#d63031' : '#fdcb6e'
            const text = st?.state === 'open' ? 'OPEN' : st?.state === 'closed' ? 'CLOSED' : 'NOT OPEN'
            return (
              <div key={p.id} onClick={() => openSite(p)} style={{ background: 'var(--surface)', border: `1px solid ${colour}55`, borderRadius: '12px', padding: '16px', marginBottom: '12px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#e2e8f0' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {p.volume_litres ? `${Number(p.volume_litres).toLocaleString()} L` : 'Volume not set'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px', color: colour, background: `${colour}22`, border: `1px solid ${colour}55`, padding: '4px 9px', borderRadius: '99px' }}>{text}</span>
                    <ChevronRight size={20} color="#64748b" />
                  </div>
                </div>
                {st?.reason && st.state !== 'open' && (
                  <div style={{ fontSize: '12px', color: colour, marginTop: '8px' }}>{st.reason}</div>
                )}
                {st?.overdue?.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#e17055', marginTop: '6px' }}>
                    Not recorded yet: {st.overdue.join(', ')}
                  </div>
                )}
                {st?.gapHours && st.state === 'open' && (
                  <div style={{ fontSize: '12px', color: '#e17055', marginTop: '6px' }}>
                    {st.gapHours} hours since the last reading — the gap must not exceed {p.max_round_gap_hours} while open
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* One body of water */}
      {selected && !view && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => setSelected(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer', marginBottom: '16px' }}>← All water</button>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', marginBottom: '16px' }}>{selected.name}</div>

          {tests[0] && (
            <div style={{ ...panel, border: '1px solid var(--border)' }}>
              <div style={heading}>Last reading</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(tests[0].tested_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: RISK_COLOURS[tests[0].risk_level as keyof typeof RISK_COLOURS] ?? '#64748b' }}>
                  {RISK_LABELS[tests[0].risk_level as keyof typeof RISK_LABELS] ?? ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                {[['FC', tests[0].free_chlorine], ['pH', tests[0].ph], ['TA', tests[0].total_alkalinity]].map(([l, v]) => (
                  <div key={l as string}>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{l}</div>
                    <div style={{ fontWeight: '700', color: '#e2e8f0' }}>{(v as number) ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: '#0077b6' }} onClick={() => setView('tasks')}>
              <ClipboardList size={16} /> Checklist
            </button>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={() => setView('test')}>
              <Droplets size={16} /> Record a round
            </button>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: '#b8860b' }} onClick={() => setView('calc')}>
              <Calculator size={16} /> Dose calculator
            </button>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: '#d63031' }} onClick={() => setView('contam')}>
              <AlertTriangle size={16} /> Something in the water
            </button>
          </div>
        </div>
      )}

      {/* Checklist */}
      {selected && view === 'tasks' && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => setView(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer', marginBottom: '16px' }}>← Back</button>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>Checklist</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>{selected.name}</div>
          <SiteTaskList poolId={selected.id} fullScreen />
        </div>
      )}

      {/* Record a round — the day's rounds, what is done, and what still has to be */}
      {selected && view === 'test' && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => { setView(null); setRound(null) }} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer', marginBottom: '16px' }}>← Back</button>

          {!site ? (
            <div style={{ color: '#64748b', fontSize: '13px' }}>Loading…</div>
          ) : round ? (
            <ManualRoundForm
              pool={site.pool} targets={site.targets}
              roundKey={round.key} roundLabel={round.label}
              retestOf={round.retestOf ?? null}
              acidDosesToday={site.acidDosesToday ?? 0}
              calibrationToday={site.calibrationToday ?? null}
              onCancel={() => setRound(null)}
              onSaved={() => { setRound(null); loadSite(selected.id); load() }}
            />
          ) : (
            <>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>Today&apos;s rounds</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>{selected.name}</div>

              {site.calibrationToday
                ? <div style={{ fontSize: '12px', fontWeight: '700', color: site.calibrationToday.pass ? '#00b894' : '#ff7675', marginBottom: '12px' }}>
                    Calibration disc {site.calibrationToday.pass ? 'passed' : 'FAILED'} today — {site.calibrationToday.pass ? 'the meter is good to use' : 'do not use the meter, ring Ace on 0422 470 214'}
                  </div>
                : <div style={{ fontSize: '12px', color: '#fdcb6e', marginBottom: '12px' }}>
                    Calibration disc not run yet today — it is the first thing on the pre-open round.
                  </div>}

              {(site.rounds ?? []).length === 0 && (
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>No fixed rounds for this site — record a reading whenever you test.</div>
              )}

              {(site.rounds ?? []).map((r: any) => {
                const done = (site.tests ?? []).filter((t: any) => t.round_key === r.round_key && !t.is_retest)
                const isDone = done.length > 0
                return (
                  <div key={r.id} style={{ background: 'var(--surface)', border: `1px solid ${isDone ? '#00b89440' : 'var(--border)'}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#e2e8f0' }}>
                          {isDone && <CheckCircle size={14} color="#00b894" style={{ verticalAlign: '-2px', marginRight: '6px' }} />}
                          {r.label}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          <Clock size={11} style={{ verticalAlign: '-1px', marginRight: '4px' }} />
                          {String(r.scheduled_at).slice(0, 5)}
                          {r.is_gate ? ' · the baths do not open until this passes' : ''}
                        </div>
                      </div>
                      <button className="btn btn-primary" style={{ padding: '10px 14px', background: isDone ? 'var(--surface-2)' : undefined, color: isDone ? '#94a3b8' : undefined }}
                        onClick={() => setRound({ key: r.round_key, label: r.label })}>
                        {isDone ? 'Add another' : 'Record'}
                      </button>
                    </div>
                    {done.map((t: any) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '12px', color: '#94a3b8' }}>
                        <span>
                          {new Date(t.tested_at).toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne', hour: '2-digit', minute: '2-digit' })}
                          {' · FC '}{t.free_chlorine ?? '—'}{' · pH '}{t.ph ?? '—'}
                          {t.staff?.first_name ? ` · ${t.staff.first_name}` : ''}
                        </span>
                        <button type="button" onClick={() => setRound({ key: r.round_key, label: r.label, retestOf: t.id })}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: '#00b4d8', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          <RotateCcw size={10} style={{ verticalAlign: '-1px', marginRight: '3px' }} />Retest
                        </button>
                      </div>
                    ))}
                    {(site.tests ?? []).filter((t: any) => t.round_key === r.round_key && t.is_retest).map((t: any) => (
                      <div key={t.id} style={{ marginTop: '6px', fontSize: '12px', color: '#00b894' }}>
                        ↳ retest {new Date(t.tested_at).toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne', hour: '2-digit', minute: '2-digit' })}
                        {' · FC '}{t.free_chlorine ?? '—'}{' · pH '}{t.ph ?? '—'}
                      </div>
                    ))}
                  </div>
                )
              })}

              {(site.rounds ?? []).length === 0 && (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                  onClick={() => setRound({ key: 'adhoc', label: 'Reading' })}>Record a reading</button>
              )}
            </>
          )}
        </div>
      )}

      {/* Dose calculator */}
      {selected && view === 'calc' && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => setView(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer', marginBottom: '16px' }}>← Back</button>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>Dose calculator</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>{selected.name}</div>
          {site
            ? <ManualDoseCalculator pool={site.pool} targets={site.targets} acidDosesToday={site.acidDosesToday ?? 0} />
            : <div style={{ color: '#64748b', fontSize: '13px' }}>Loading…</div>}
        </div>
      )}

      {/* Contamination — form F5 */}
      {selected && view === 'contam' && (
        <div style={{ padding: '20px' }}>
          <button onClick={() => setView(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer', marginBottom: '16px' }}>← Back</button>
          <ContaminationForm pool={selected} onCancel={() => setView(null)}
            onSaved={() => { setView(null); load(); if (selected?.id) loadSite(selected.id) }} />
        </div>
      )}

      {/* Pool chemistry guide */}
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 400, overflowY: 'auto' }}>
          <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button onClick={() => setShowHelp(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer' }}>← Back</button>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#e2e8f0' }}>Pool chemistry</div>
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>How to take a sample, what the numbers mean, the dosing and safety rules, and what to do when something is out. Anything you are unsure of, ring Ace Aquatics on 0422 470 214.</div>
            <HelpGuide sections={manualSite ? MANUAL_POOL_GUIDE : POOL_GUIDE} dark />
            <ChangePassword />
          </div>
        </div>
      )}
    </div>
  )
}

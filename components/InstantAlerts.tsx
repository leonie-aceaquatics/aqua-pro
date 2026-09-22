'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, Siren } from 'lucide-react'
import { instantBalanceAlerts } from '@/lib/water-chemistry'

// Red boxes that appear the moment a low alkalinity / calcium number is typed into a water test.
// When a reading is WELL below range the box is not enough: a full-screen alarm takes over the
// phone until the technician acknowledges it. It comes back if the value gets worse again.
// Wait until the technician has stopped typing before judging the number — "1" on the way to
// "120" must not set off the alarm. A value has to sit unchanged for this long first.
const SETTLE_MS = 1500

function useSettled(value: string): string {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    if (value === '') { setSettled(''); return }        // cleared → clear the alert straight away
    const t = setTimeout(() => setSettled(value), SETTLE_MS)
    return () => clearTimeout(t)
  }, [value])
  return settled
}

export default function InstantAlerts({ ta, ch, volumeLitres }: { ta: string; ch: string; volumeLitres?: number | null }) {
  const taSettled = useSettled(ta)
  const chSettled = useSettled(ch)
  const alerts = instantBalanceAlerts(taSettled === '' ? null : Number(taSettled), chSettled === '' ? null : Number(chSettled), volumeLitres)
  const severe = alerts.filter(a => a.severe)
  const severeKey = severe.map(a => a.parameter).join('|')
  const [acked, setAcked] = useState('')        // which severe combination has been acknowledged

  // A new severe reading (or an extra parameter joining) re-arms the alarm; vibrate where supported
  useEffect(() => {
    if (severeKey && severeKey !== acked) {
      try { navigator.vibrate?.([300, 100, 300, 100, 600]) } catch { /* not on this device */ }
    }
  }, [severeKey, acked])

  if (alerts.length === 0) return null
  const showAlarm = severeKey !== '' && acked !== severeKey

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
        {alerts.map(a => (
          <div key={a.parameter} role="alert" style={{ background: '#d6303122', border: '2px solid #d63031', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff7675', fontWeight: '800', fontSize: '14px', letterSpacing: '0.3px' }}>
              <AlertTriangle size={18} /> {a.headline}
            </div>
            <div style={{ color: '#e2e8f0', fontSize: '13px', marginTop: '4px' }}>{a.action}</div>
            {a.dose && <div style={{ color: '#ff7675', fontSize: '13px', fontWeight: '700', marginTop: '4px' }}>{a.dose} for this pool</div>}
          </div>
        ))}
      </div>

      {showAlarm && (
        <div role="alertdialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#7a0f12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center', color: '#fff' }}>
            <Siren size={64} style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '0.5px', lineHeight: 1.15, marginBottom: '18px' }}>
              STOP — WATER NEEDS FIXING NOW
            </div>
            {severe.map(a => (
              <div key={a.parameter} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px', textAlign: 'left' }}>
                <div style={{ fontSize: '18px', fontWeight: '800' }}>{a.headline}</div>
                <div style={{ fontSize: '15px', marginTop: '6px', lineHeight: 1.4 }}>{a.action}</div>
                {a.dose && <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px' }}>{a.dose} for this pool</div>}
              </div>
            ))}
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '18px' }}>
              Dose it before you leave, re-test, and log the second test. If you can&apos;t fix it, ring Tony on 0422 470 214.
            </div>
            <button type="button" onClick={() => setAcked(severeKey)}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: '#fff', color: '#7a0f12', fontSize: '17px', fontWeight: '800', cursor: 'pointer' }}>
              I understand — I will fix it now
            </button>
          </div>
        </div>
      )}
    </>
  )
}

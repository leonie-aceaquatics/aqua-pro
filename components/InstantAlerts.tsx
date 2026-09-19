'use client'
import { AlertTriangle } from 'lucide-react'
import { instantBalanceAlerts } from '@/lib/water-chemistry'

// Red boxes that appear the moment a low alkalinity / calcium number is typed into a water test.
export default function InstantAlerts({ ta, ch, volumeLitres }: { ta: string; ch: string; volumeLitres?: number | null }) {
  const alerts = instantBalanceAlerts(ta === '' ? null : Number(ta), ch === '' ? null : Number(ch), volumeLitres)
  if (alerts.length === 0) return null
  return (
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
  )
}

'use client'
import { Beaker, Phone } from 'lucide-react'
import { DOSING_RULES, type ManualDose } from '@/lib/manual-dose'

// The "What to add" panel for a manually dosed site: amount, why, and the handling rule, with
// the dosing rules underneath. Shared by the calculator and the technician's test form.
export default function ManualDoseList({ doses, footer, rules = DOSING_RULES }: { doses: ManualDose[]; footer?: React.ReactNode; rules?: string[] }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid #fdcb6e50', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#fdcb6e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
        <Beaker size={13} style={{ verticalAlign: '-2px', marginRight: '5px' }} />What to add
      </div>
      {doses.map((d, i) => (
        <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '8px',
          background: d.severity === 'stop' ? '#d6303122' : 'var(--surface-2)',
          border: `1px solid ${d.severity === 'stop' ? '#d63031' : 'var(--border)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: d.severity === 'stop' ? '#ff7675' : '#e2e8f0' }}>{d.chemical}</span>
            <span style={{ fontSize: '17px', fontWeight: '800', color: d.severity === 'stop' ? '#ff7675' : '#00b4d8' }}>{d.amount}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{d.reason}</div>
          {d.note && <div style={{ fontSize: '12px', color: d.severity === 'stop' ? '#ff7675' : '#fdcb6e', marginTop: '4px' }}>{d.note}</div>}
          {d.severity === 'stop' && (
            <a href="tel:0422470214" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#fff', background: '#d63031', padding: '10px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}>
              <Phone size={15} /> Call Ace 0422 470 214
            </a>
          )}
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
        {rules.map(r => <div key={r} style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>· {r}</div>)}
      </div>
      {footer}
    </div>
  )
}

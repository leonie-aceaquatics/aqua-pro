'use client'
import { useState, useMemo } from 'react'
import { Beaker, Phone } from 'lucide-react'
import { manualDoses, DOSING_RULES, type ManualDose } from '@/lib/manual-dose'
import type { SiteTarget } from '@/lib/water-chemistry'

// "What would I add?" for a manually dosed site, without saving anything.
//
// Only the four things an operator at a site like this actually measures. No calcium hardness
// (that is on the service provider's weekly panel), no cyanuric acid, no salt, no controller
// readings and no UV — none of it exists at a hand-dosed bath, and asking for it invites
// someone to write a number in that nobody tested.

export default function ManualDoseCalculator({
  pool, targets, acidDosesToday = 0,
}: { pool: any; targets: SiteTarget[]; acidDosesToday?: number }) {
  const [v, setV] = useState({ free_chlorine: '', total_chlorine: '', ph: '', total_alkalinity: '' })
  const n = (x: string) => x === '' ? null : Number(x)

  const t = (p: string) => targets.find(x => x.parameter === p)

  const doses: ManualDose[] = useMemo(() => {
    const fcT = t('freeChlorine'), phT = t('ph'), taT = t('totalAlkalinity')
    return manualDoses(
      { freeChlorine: n(v.free_chlorine), totalChlorine: n(v.total_chlorine), ph: n(v.ph), totalAlkalinity: n(v.total_alkalinity) },
      {
        freeChlorineIdeal: fcT?.ideal_value ?? 3, freeChlorineMin: fcT?.min_value ?? 2, freeChlorineMax: fcT?.max_value ?? 5,
        phMin: phT?.min_value ?? 7.3, phMax: phT?.max_value ?? 7.6,
        alkalinityMin: taT?.min_value ?? 80, alkalinityIdeal: taT?.ideal_value ?? 100,
      },
      {
        volumeLitres: Number(pool?.volume_litres) || 0,
        fixedAcidDoseG: pool?.fixed_acid_dose_g, fixedAcidMaxDoses: pool?.fixed_acid_max_doses,
        fixedSodaAshDoseG: pool?.fixed_soda_ash_dose_g, acidDosesSoFar: acidDosesToday,
      },
    )
  }, [v, targets, pool, acidDosesToday]) // eslint-disable-line react-hooks/exhaustive-deps

  const label: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }
  const field: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '16px', width: '100%', outline: 'none' }

  const input = (k: keyof typeof v, lbl: string, ph: string) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={label}>{lbl}</label>
      <input type="number" step="0.01" inputMode="decimal" placeholder={ph} value={v[k]}
        onChange={e => setV(s => ({ ...s, [k]: e.target.value }))} style={field} />
    </div>
  )

  if (!pool?.volume_litres) {
    return <div style={{ color: '#e17055', fontSize: '13px' }}>This body of water has no volume recorded, so a dose cannot be worked out. Ring Ace Aquatics on 0422 470 214.</div>
  }

  return (
    <>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
        Try a reading without saving it. {Number(pool.volume_litres).toLocaleString()} L.
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
        {input('free_chlorine', 'Free chlorine (mg/L)', '3.0')}
        {input('total_chlorine', 'Total chlorine (mg/L)', '3.2')}
        {input('ph', 'pH', '7.45')}
        {input('total_alkalinity', 'Total alkalinity (mg/L)', '100')}
      </div>

      {doses.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
          Enter a reading above and the dose appears here.
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid #fdcb6e50', borderRadius: '10px', padding: '16px' }}>
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
            {DOSING_RULES.map(r => <div key={r} style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>· {r}</div>)}
          </div>
          <div style={{ fontSize: '12px', color: '#fdcb6e', marginTop: '8px' }}>
            Nothing here is saved. When you dose for real, record it on the round so the dose and its retest are in the record.
          </div>
        </div>
      )}
    </>
  )
}

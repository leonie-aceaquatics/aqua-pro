'use client'
import { useState, useMemo } from 'react'
import { manualDosesForSite, dosingRules, type ManualDose, type DoseChartRow } from '@/lib/manual-dose'
import type { SiteTarget } from '@/lib/water-chemistry'
import ManualDoseList from './ManualDoseList'

// "What would I add?" for a manually dosed site, without saving anything.
//
// Only the four things an operator at a site like this actually measures, plus calcium hardness
// where the site's posted chart covers it (AUN's weekly test). No cyanuric acid, no salt, no controller
// readings and no UV — none of it exists at a hand-dosed bath, and asking for it invites
// someone to write a number in that nobody tested.

export default function ManualDoseCalculator({
  pool, targets, acidDosesToday = 0, chart = [],
}: { pool: any; targets: SiteTarget[]; acidDosesToday?: number; chart?: DoseChartRow[] }) {
  const [v, setV] = useState({ free_chlorine: '', total_chlorine: '', ph: '', total_alkalinity: '', calcium_hardness: '' })
  // Calcium hardness only where the site's chart says how to raise it (a weekly test)
  const hasCalcium = chart.some(r => r.chemical === 'calcium_chloride')
  const n = (x: string) => x === '' ? null : Number(x)

  const doses: ManualDose[] = useMemo(() => manualDosesForSite(
    { freeChlorine: n(v.free_chlorine), totalChlorine: n(v.total_chlorine), ph: n(v.ph), totalAlkalinity: n(v.total_alkalinity),
      calciumHardness: n(v.calcium_hardness) },
    pool, targets, acidDosesToday, chart,
  ), [v, targets, pool, acidDosesToday, chart]) // eslint-disable-line react-hooks/exhaustive-deps

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
        {hasCalcium && input('calcium_hardness', 'Calcium hardness (mg/L) · weekly', '200')}
      </div>

      {doses.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
          {Object.values(v).some(x => x !== '')
            ? 'Everything entered is within this site’s targets. Nothing to add.'
            : 'Enter a reading above and the dose appears here.'}
        </div>
      ) : (
        <ManualDoseList doses={doses} rules={dosingRules(pool.retest_wait_minutes)} footer={
          <div style={{ fontSize: '12px', color: '#fdcb6e', marginTop: '8px' }}>
            Nothing here is saved. When you dose for real, record it on the round so the dose and its retest are in the record.
          </div>
        } />
      )}

      {chart.length > 0 && <PostedChart chart={chart} />}
    </>
  )
}

const CHART_HEADINGS: Record<string, string> = {
  hypochlorite: 'Raise free chlorine', acid: 'Lower pH', bicarbonate: 'Raise alkalinity',
  calcium_chloride: 'Raise calcium hardness', salt: 'Raise salt', soda_ash: 'Raise pH',
  thiosulphate: 'Lower chlorine', superchlorination: 'Superchlorination (pool closed) — by combined chlorine reading',
  diarrhoea: 'Diarrhoea in the water',
}

// The posted chart itself, so the phone matches the wall
function PostedChart({ chart }: { chart: DoseChartRow[] }) {
  const groups = Object.keys(CHART_HEADINGS).filter(c => chart.some(r => r.chemical === c))
  return (
    <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Posted dose chart</div>
      {groups.map(g => (
        <div key={g} style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>{CHART_HEADINGS[g]}</div>
          {chart.filter(r => r.chemical === g).map(r => (
            <div key={r.step} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', color: '#94a3b8', padding: '2px 0' }}>
              <span>{g === 'diarrhoea' ? r.product : `${g === 'superchlorination' ? 'reading' : 'by'} ${r.step}`}</span>
              <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{r.amount} {r.unit}{r.plain_terms ? ` · ${r.plain_terms}` : ''}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

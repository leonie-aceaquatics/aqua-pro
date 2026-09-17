'use client'
import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import SiteStockCount from './SiteStockCount'

// Admin → Chemicals → Site Stock: every site's stock in one grid, low cells highlighted,
// plus a per-site count form (same one the technicians use).
export default function SiteStockTab() {
  const [data, setData] = useState<{ chemicals: any[]; pools: any[]; stock: any[] } | null>(null)
  const [siteId, setSiteId] = useState('')

  const load = useCallback(() => {
    fetch('/api/site-stock').then(r => r.json()).then(d => setData({ chemicals: d.chemicals ?? [], pools: d.pools ?? [], stock: d.stock ?? [] }))
  }, [])
  useEffect(() => { load() }, [load])

  if (!data) return <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>

  const cell = new Map<string, any>()
  for (const r of data.stock) cell.set(`${r.pool_id}:${r.chemical_id}`, r)
  const isLow = (c: any, r: any) => !!r && Number(c.reorder_point) > 0 && Number(r.quantity) <= Number(c.reorder_point)

  // Sites with anything low, for the summary strip
  const lowBySite = data.pools.map(p => ({
    pool: p,
    low: data.chemicals.filter(c => isLow(c, cell.get(`${p.id}:${c.id}`))),
    counted: data.chemicals.some(c => cell.has(`${p.id}:${c.id}`)),
  }))
  const sitesLow = lowBySite.filter(x => x.low.length > 0)
  const neverCounted = lowBySite.filter(x => !x.counted)
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { timeZone: 'Australia/Melbourne', day: 'numeric', month: 'short' })

  return (
    <>
      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px', maxWidth: '760px' }}>
        Stock held at each site, as last counted by the technician on site. Anything at or below the chemical's reorder point is highlighted and added to the To Order list against that site.
      </div>

      {(sitesLow.length > 0 || neverCounted.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {sitesLow.map(x => (
            <div key={x.pool.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 14px', background: '#e1705510', border: '1px solid #e1705540', borderRadius: '8px', fontSize: '13px' }}>
              <AlertTriangle size={15} color="#e17055" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <span style={{ fontWeight: '700', color: 'var(--text)' }}>{x.pool.name}</span>
                <span style={{ color: 'var(--text-muted)' }}> is low on </span>
                <span style={{ color: '#e17055' }}>{x.low.map(c => `${c.name} (${Number(cell.get(`${x.pool.id}:${c.id}`).quantity)} ${c.unit})`).join(', ')}</span>
              </div>
            </div>
          ))}
          {neverCounted.length > 0 && (
            <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Never counted: {neverCounted.map(x => x.pool.name).join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="table-wrap" style={{ marginBottom: '24px' }}>
        <table>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--surface)' }}>Chemical</th>
              {data.pools.map(p => <th key={p.id} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{p.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.chemicals.length === 0 ? (
              <tr><td colSpan={data.pools.length + 1} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No chemicals added yet</td></tr>
            ) : data.chemicals.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: '600', position: 'sticky', left: 0, background: 'var(--surface)', whiteSpace: 'nowrap' }}>
                  {c.name}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>reorder at {Number(c.reorder_point) || '—'} {c.unit}</div>
                </td>
                {data.pools.map(p => {
                  const r = cell.get(`${p.id}:${c.id}`)
                  const low = isLow(c, r)
                  return (
                    <td key={p.id} title={r?.last_counted_at ? `Counted ${fmtDate(r.last_counted_at)}` : 'Not counted'}
                      style={{ textAlign: 'center', color: low ? '#e17055' : r ? 'var(--text)' : 'var(--text-dim)', fontWeight: low ? '700' : 'normal', background: low ? '#e1705510' : undefined, cursor: 'pointer' }}
                      onClick={() => setSiteId(p.id)}>
                      {r ? Number(r.quantity) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>Count stock at a site</div>
          <select value={siteId} onChange={e => setSiteId(e.target.value)} style={{ width: '240px' }}>
            <option value="">Select site…</option>
            {data.pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {siteId ? (
          <SiteStockCount key={siteId} poolId={siteId} onSaved={load} />
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pick a site (or click a cell above) to enter or correct its stock.</div>
        )}
      </div>
    </>
  )
}

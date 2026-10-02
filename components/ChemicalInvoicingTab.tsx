'use client'
import { useState, useEffect, useCallback } from 'react'
import { Download, Receipt, AlertTriangle } from 'lucide-react'

// What was used at each site over a month, in litres and kilograms, priced for invoicing.
// Defaults to last month, because that is what you invoice at the start of a new one.

const money = (n: number | null) => n == null ? '—' : `$${n.toFixed(2)}`
const monthRange = (offset: number) => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { from: iso(start), to: iso(end), label: start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) }
}

export default function ChemicalInvoicingTab({ pools }: { pools: any[] }) {
  const lastMonth = monthRange(-1)
  const [from, setFrom] = useState(lastMonth.from)
  const [to, setTo] = useState(lastMonth.to)
  const [poolId, setPoolId] = useState('all')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/chemical-invoicing?from=${from}&to=${to}&pool_id=${poolId}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => { setData(null); setLoading(false) })
  }, [from, to, poolId])
  useEffect(() => { load() }, [load])

  const setMonth = (offset: number) => { const m = monthRange(offset); setFrom(m.from); setTo(m.to) }
  const csvUrl = `/api/admin/chemical-invoicing?from=${from}&to=${to}&pool_id=${poolId}&format=csv`

  const unpriced = (data?.invoices ?? []).flatMap((i: any) => i.unpriced)
  const uniqueUnpriced = [...new Set(unpriced)] as string[]

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
        <div>
          <label>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: '160px' }} />
        </div>
        <div>
          <label>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: '160px' }} />
        </div>
        <div>
          <label>Site</label>
          <select value={poolId} onChange={e => setPoolId(e.target.value)} style={{ width: '220px' }}>
            <option value="all">All sites</option>
            {pools.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setMonth(-1)}>Last month</button>
        <button type="button" className="btn btn-secondary" onClick={() => setMonth(0)}>This month</button>
        <a href={csvUrl} className="btn btn-primary" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
          <Download size={15} /> Download for invoicing
        </a>
      </div>

      {uniqueUnpriced.length > 0 && (
        <div style={{ background: '#e1705518', border: '1px solid #e1705550', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--text)' }}>
          <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: '6px', color: '#e17055' }} />
          No charge rate set for: <strong>{uniqueUnpriced.join(', ')}</strong>. The quantity is counted but nothing is billed —
          set a rate under Depot Inventory and these will price themselves.
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: '32px', textAlign: 'center' }}>Loading…</div>
      ) : !data?.invoices?.length ? (
        <div style={{ color: 'var(--text-muted)', padding: '32px', textAlign: 'center' }}>No chemicals logged in this period.</div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '16px', display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To invoice</div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--aqua)' }}>{money(data.totals.charge)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chemical cost</div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text)' }}>{money(data.totals.cost)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Margin</div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: '#00b894' }}>{money(data.totals.margin)}</div>
            </div>
            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', fontSize: '12px', color: 'var(--text-muted)' }}>
              {data.invoices.length} site{data.invoices.length === 1 ? '' : 's'} · {from} to {to}
            </div>
          </div>

          {data.invoices.map((site: any) => (
            <div key={site.poolId} className="card" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
                  <Receipt size={15} style={{ verticalAlign: '-2px', marginRight: '6px' }} />{site.pool}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--aqua)' }}>{money(site.charge)}</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Chemical</th><th>Used</th><th>Rate</th><th>Charge</th><th>Cost</th><th>Margin</th></tr>
                  </thead>
                  <tbody>
                    {site.lines.map((l: any) => (
                      <tr key={l.chemicalId}>
                        <td>{l.chemical}</td>
                        <td style={{ fontWeight: '600' }}>{l.quantity} {l.unit}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{l.rate == null ? <span style={{ color: '#e17055' }}>no rate</span> : `${money(l.rate)}/${l.unit}`}</td>
                        <td style={{ fontWeight: '700', color: l.charge == null ? '#e17055' : 'var(--text)' }}>{money(l.charge)}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{money(l.cost)}</td>
                        <td style={{ color: l.charge != null && l.cost != null ? '#00b894' : 'var(--text-dim)' }}>
                          {l.charge != null && l.cost != null ? money(Math.round((l.charge - l.cost) * 100) / 100) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

'use client'
import { useState, useEffect, useCallback } from 'react'

// Count the chemical stock held at one site. Used full-screen in the technician app and
// inline in Admin → Chemicals → Site Stock. Blank = not held / not counted here.
export default function SiteStockCount({ poolId, poolName, onClose, onSaved, fullScreen = false }: {
  poolId: string
  poolName?: string
  onClose?: () => void
  onSaved?: () => void
  fullScreen?: boolean
}) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch(`/api/site-stock?pool_id=${poolId}`).then(r => r.json()).then(d => {
      const rs = d.rows ?? []
      setRows(rs)
      setCounts(Object.fromEntries(rs.map((r: any) => [r.chemical.id, r.quantity === null ? '' : String(r.quantity)])))
    }).catch(() => setRows([]))
  }, [poolId])
  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true); setError('')
    const res = await fetch('/api/site-stock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool_id: poolId, counts: Object.entries(counts).map(([chemical_id, quantity]) => ({ chemical_id, quantity })) }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setError(d.error ?? 'Could not save'); return }
    setSavedAt(new Date().toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne', hour: '2-digit', minute: '2-digit' }))
    load()
    onSaved?.()
  }

  const lastCount = rows?.find(r => r.last_counted_at)
  const fmt = (iso: string) => new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const anyEntered = Object.values(counts).some(v => v !== '')

  const body = (
    <>
      {lastCount && (
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
          Last counted {fmt(lastCount.last_counted_at)}{lastCount.last_counted_by ? ` by ${lastCount.last_counted_by}` : ''}
        </div>
      )}
      {rows === null ? (
        <div style={{ color: '#64748b', fontSize: '13px' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '13px' }}>No chemicals set up yet — add them in Admin → Chemicals.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {rows.map(r => {
            const v = counts[r.chemical.id] ?? ''
            const low = v !== '' && Number(r.chemical.reorder_point) > 0 && Number(v) <= Number(r.chemical.reorder_point)
            return (
              <div key={r.chemical.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#0d1829', borderRadius: '8px', border: `1px solid ${low ? '#e1705560' : '#1a2d45'}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.chemical.name}</div>
                  <div style={{ fontSize: '11px', color: low ? '#e17055' : '#64748b' }}>
                    {low ? `LOW — reorder at ${Number(r.chemical.reorder_point)} ${r.chemical.unit}` : r.quantity === null ? 'Not counted here yet' : `Reorder at ${Number(r.chemical.reorder_point) || '—'} ${r.chemical.unit}`}
                  </div>
                </div>
                <input type="number" inputMode="decimal" step="0.5" min="0" value={v} placeholder="—"
                  onChange={e => setCounts(c => ({ ...c, [r.chemical.id]: e.target.value }))}
                  style={{ width: '76px', padding: '10px 8px', fontSize: '16px', textAlign: 'center', background: '#121f35', border: '1px solid #1a2d45', borderRadius: '8px', color: '#e2e8f0' }} />
                <span style={{ fontSize: '12px', color: '#64748b', width: '38px' }}>{r.chemical.unit}</span>
              </div>
            )
          })}
        </div>
      )}
      {error && <div style={{ color: '#d63031', fontSize: '12px', marginTop: '10px' }}>{error}</div>}
      {savedAt && !error && <div style={{ color: '#00b894', fontSize: '12px', marginTop: '10px' }}>Saved at {savedAt}</div>}
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        {onClose && <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '14px' }} onClick={onClose}>Close</button>}
        <button type="button" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '14px' }} disabled={saving || !anyEntered || !rows?.length} onClick={save}>
          {saving ? 'Saving…' : 'Save Stock Count'}
        </button>
      </div>
    </>
  )

  if (!fullScreen) return body
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080e1a', zIndex: 300, overflowY: 'auto' }}>
      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={onClose} style={{ background: '#121f35', border: '1px solid #1a2d45', borderRadius: '8px', color: '#e2e8f0', padding: '8px 14px', cursor: 'pointer' }}>
            ← Back
          </button>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#e2e8f0' }}>Count Stock</div>
        </div>
        <div style={{ marginBottom: '4px', color: '#64748b', fontSize: '13px' }}>{poolName}</div>
        <div style={{ marginBottom: '16px', color: '#64748b', fontSize: '12px' }}>Enter how many of each are on site right now. Leave blank for anything this site doesn't hold.</div>
        {body}
      </div>
    </div>
  )
}

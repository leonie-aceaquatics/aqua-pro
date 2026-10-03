'use client'
import { useState, useEffect, useCallback } from 'react'
import { Package, CheckCircle, Minus, Plus, Search } from 'lucide-react'

// "What did you put in?" in as few taps as the job allows.
//
// A dropdown of forty products is a hunt, and a hunt on a wet phone in a plant room gets
// skipped. So the products this site actually uses come first, each tile already carrying the
// amount used here last time: tap it and it is recorded. Adjust only when today was different.

export interface UsedItem { chemical_id: string; quantity: string }

const unitOf = (c: any) => c.dose_unit ?? c.unit ?? ''

/** Sensible amounts to tap, by the unit the product is dosed in. */
const presetsFor = (unit: string): number[] =>
  unit === 'mL' ? [50, 100, 250, 500]
  : unit === 'g' ? [50, 100, 250, 500]
  : unit === 'kg' ? [0.5, 1, 2, 5]
  : unit === 'tablet' || unit === 'each' ? [1, 2, 3, 5]
  : [1, 2, 5, 10]   // L

const stepFor = (unit: string) => unit === 'mL' || unit === 'g' ? 50 : unit === 'kg' ? 0.5 : 1
const tidy = (n: number) => Math.round(n * 100) / 100

export default function QuickChemicalLog({
  poolId, poolName, onSaved, onCancel,
}: { poolId: string; poolName: string; onSaved: (n: number) => void; onCancel: () => void }) {
  const [products, setProducts] = useState<any[]>([])
  const [items, setItems] = useState<UsedItem[]>([])
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/technician/chemical-usage?pool_id=${poolId}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? []); setLoading(false) })
      .catch(() => { setError('Could not load the product list.'); setLoading(false) })
  }, [poolId])

  const qtyOf = (id: string) => items.find(i => i.chemical_id === id)?.quantity ?? ''
  const setQty = useCallback((id: string, q: string) => {
    setItems(xs => {
      if (q === '' || Number(q) <= 0) return xs.filter(x => x.chemical_id !== id)
      return xs.some(x => x.chemical_id === id)
        ? xs.map(x => x.chemical_id === id ? { ...x, quantity: q } : x)
        : [...xs, { chemical_id: id, quantity: q }]
    })
  }, [])

  /** Tapping a tile records the amount used here last time, or one preset step if it is new. */
  const tapTile = (c: any) => {
    if (qtyOf(c.id)) { setQty(c.id, ''); return }
    const unit = unitOf(c)
    setQty(c.id, String(c.last_quantity ?? presetsFor(unit)[1] ?? 1))
  }

  const nudge = (c: any, dir: 1 | -1) => {
    const unit = unitOf(c)
    const next = tidy(Math.max(0, Number(qtyOf(c.id) || 0) + dir * stepFor(unit)))
    setQty(c.id, next > 0 ? String(next) : '')
  }

  async function save() {
    if (!items.length) { setError('Tap a product first.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/technician/chemical-usage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool_id: poolId, items, notes }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error ?? 'Could not record this.'); setSaving(false); return }
      if (d.errors?.length) { setError(`Recorded ${d.logged}, but ${d.errors.length} did not save. Tell the office.`); setSaving(false); return }
      onSaved(d.logged)
    } catch {
      setError('No connection — nothing was recorded. Try again when you are back online.')
    }
    setSaving(false)
  }

  const q = search.trim().toLowerCase()
  const used = products.filter(p => p.uses > 0)
  const visible = q ? products.filter(p => p.name.toLowerCase().includes(q))
    : showAll || used.length === 0 ? products : used

  return (
    <>
      <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>What did you put in?</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
        {poolName} · everything recorded here goes on the site&apos;s monthly invoice.
      </div>

      {products.length > 6 && (
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={15} style={{ position: 'absolute', left: '11px', top: '12px', color: '#64748b' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a product"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px 10px 34px', fontSize: '16px', width: '100%', outline: 'none' }} />
        </div>
      )}

      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '32px' }}>Loading…</div>
      ) : (
        <>
          {!q && used.length > 0 && !showAll && (
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Used at this site
            </div>
          )}
          {visible.map(c => {
            const unit = unitOf(c)
            const on = !!qtyOf(c.id)
            return (
              <div key={c.id} style={{ background: 'var(--surface)', border: `1px solid ${on ? '#00b894' : 'var(--border)'}`, borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
                <button type="button" onClick={() => tapTile(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                  {on ? <CheckCircle size={18} color="#00b894" style={{ flexShrink: 0 }} /> : <Package size={18} color="#64748b" style={{ flexShrink: 0 }} />}
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: on ? '#00b894' : '#e2e8f0' }}>{c.name}</span>
                  {!on && c.last_quantity != null && (
                    <span style={{ fontSize: '12px', color: '#64748b', flexShrink: 0 }}>last: {c.last_quantity} {unit}</span>
                  )}
                </button>

                {on && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <button type="button" onClick={() => nudge(c, -1)} aria-label="less"
                        style={{ width: '44px', height: '44px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={18} /></button>
                      <input type="number" inputMode="decimal" step="any" min="0" value={qtyOf(c.id)}
                        onChange={e => setQty(c.id, e.target.value)}
                        style={{ flex: 1, minWidth: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '12px', fontSize: '18px', fontWeight: '700', textAlign: 'center', outline: 'none' }} />
                      <span style={{ fontSize: '14px', color: '#94a3b8', width: '34px' }}>{unit}</span>
                      <button type="button" onClick={() => nudge(c, 1)} aria-label="more"
                        style={{ width: '44px', height: '44px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={18} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {presetsFor(unit).map(v => (
                        <button key={v} type="button" onClick={() => setQty(c.id, String(v))}
                          style={{ padding: '7px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                            border: `1px solid ${Number(qtyOf(c.id)) === v ? '#00b4d8' : 'var(--border)'}`,
                            background: Number(qtyOf(c.id)) === v ? '#00b4d825' : 'var(--surface-2)',
                            color: Number(qtyOf(c.id)) === v ? '#00b4d8' : '#94a3b8' }}>{v} {unit}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {!q && !showAll && used.length > 0 && products.length > used.length && (
            <button type="button" onClick={() => setShowAll(true)} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginBottom: '8px' }}>
              Something else ({products.length - used.length} more)
            </button>
          )}
          {visible.length === 0 && <div style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>No product matches that.</div>}
        </>
      )}

      <div style={{ marginTop: '4px', marginBottom: '12px' }}>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note (optional) — why you added it"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#e2e8f0', padding: '10px 12px', fontSize: '14px', width: '100%', resize: 'vertical' }} />
      </div>

      {error && <div style={{ color: '#ff7675', fontSize: '13px', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '10px', position: 'sticky', bottom: 0, background: 'var(--bg)', paddingTop: '8px', paddingBottom: '8px' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ padding: '14px 18px' }}>Cancel</button>
        <button type="button" onClick={save} disabled={saving || !items.length} className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '15px', opacity: items.length ? 1 : 0.5 }}>
          {saving ? 'Saving…' : items.length ? `Record ${items.length} product${items.length === 1 ? '' : 's'}` : 'Tap a product above'}
        </button>
      </div>
    </>
  )
}

'use client'
import { useState, useEffect, useCallback } from 'react'
import { ListChecks, Plus, Trash2 } from 'lucide-react'

// Admin editor for the simple per-site task list. Tasks are either for every site
// (pool_id null) or one pool; technicians tick them off per visit in the tech app.
export default function SiteTasksAdmin({ pools }: { pools: any[] }) {
  const [scope, setScope] = useState('all')       // 'all' or a pool id
  const [tasks, setTasks] = useState<any[]>([])
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetch(`/api/admin/site-tasks?pool_id=${scope}`).then(r => r.json()).then(d => setTasks(d.tasks ?? []))
  }, [scope])
  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setSaving(true); setError('')
    const res = await fetch('/api/admin/site-tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim(), pool_id: scope === 'all' ? null : scope, sort_order: tasks.length }),
    })
    const d = await res.json()
    if (!res.ok) setError(d.error ?? 'Could not add task')
    else { setLabel(''); load() }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Remove this task from the list?')) return
    await fetch(`/api/admin/site-tasks?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
          <ListChecks size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Site Tasks
        </div>
        <select value={scope} onChange={e => setScope(e.target.value)} style={{ width: '220px' }}>
          <option value="all">All sites</option>
          {pools.map(p => <option key={p.id} value={p.id}>{p.name} only</option>)}
        </select>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        What technicians tick off on each visit. "All sites" tasks show at every pool; pick a pool to add tasks just for it.
      </div>

      {tasks.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>No tasks yet — add the first one below.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          {tasks.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', width: '20px' }}>{i + 1}.</span>
              <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)' }}>{t.label}</span>
              <button type="button" onClick={() => remove(t.id)} title="Remove"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} style={{ display: 'flex', gap: '8px' }}>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Empty skimmer baskets" style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary" disabled={saving || !label.trim()}>
          <Plus size={14} /> Add
        </button>
      </form>
      {error && <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: '8px' }}>{error}</div>}
    </div>
  )
}

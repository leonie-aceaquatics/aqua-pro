'use client'
import { useState, useEffect, useCallback } from 'react'
import { ListChecks, Plus, Trash2, ClipboardCheck } from 'lucide-react'
import { groupByCategory } from '@/lib/site-tasks'

const POOL_TYPES: [string, string][] = [['splash_pad', 'Splash pads'], ['outdoor', 'Outdoor pools'], ['indoor', 'Indoor pools'], ['spa', 'Spas'], ['wading', 'Wading pools'], ['hydrotherapy', 'Hydrotherapy pools'], ['leisure', 'Leisure pools']]
const CATEGORIES = ['Arrival', 'Water quality', 'Equipment', 'Chemical dosing', 'Cleaning', 'Filtration', 'Safety', 'Compliance', 'Departure']

// Admin side of the per-site task list: edit the tasks, and see who ticked what on a day.
export default function SiteTasksAdmin({ pools }: { pools: any[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', alignItems: 'flex-start', marginBottom: '24px' }}>
      <TaskEditor pools={pools} />
      <CompletionsView pools={pools} />
    </div>
  )
}

function TaskEditor({ pools }: { pools: any[] }) {
  const [scope, setScope] = useState('all')       // 'all' or a pool id
  const [tasks, setTasks] = useState<any[]>([])
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('')
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
      body: JSON.stringify({
        label: label.trim(), category,
        pool_id: scope === 'all' || scope.startsWith('type:') ? null : scope,
        pool_type: scope.startsWith('type:') ? scope.slice(5) : null,
        sort_order: (tasks.at(-1)?.sort_order ?? 0) + 10,
      }),
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
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
          <ListChecks size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Site Tasks
        </div>
        <select value={scope} onChange={e => setScope(e.target.value)} style={{ width: '200px' }}>
          <option value="all">All sites</option>
          <optgroup label="By site type">
            {POOL_TYPES.map(([v, l]) => <option key={v} value={`type:${v}`}>All {l.toLowerCase()}</option>)}
          </optgroup>
          <optgroup label="One site only">
            {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
        </select>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        What technicians tick off on each visit. "All sites" tasks show everywhere; a site type (e.g. splash pads) adds tasks to every site of that type; or pick one site.
      </div>

      {tasks.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>No tasks yet — add the first one below.</div>
      ) : (
        <div style={{ maxHeight: '420px', overflowY: 'auto', marginBottom: '12px' }}>
          {groupByCategory(tasks).map(g => (
            <div key={g.category} style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--aqua)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 0 4px' }}>{g.category}</div>
              {g.tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', background: 'var(--surface-2)', borderRadius: '8px', marginBottom: '4px' }}>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)' }}>{t.label}</span>
                  <button type="button" onClick={() => remove(t.id)} title="Remove"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Empty skimmer baskets" style={{ flex: '1 1 200px' }} />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '160px' }}>
          <option value="">Category…</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="btn btn-primary" disabled={saving || !label.trim()}>
          <Plus size={14} /> Add
        </button>
      </form>
      {error && <div style={{ color: 'var(--red)', fontSize: '12px', marginTop: '8px' }}>{error}</div>}
    </div>
  )
}

function CompletionsView({ pools }: { pools: any[] }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })
  const [date, setDate] = useState(today)
  const [poolId, setPoolId] = useState('all')
  const [rows, setRows] = useState<any[] | null>(null)

  useEffect(() => {
    setRows(null)
    fetch(`/api/admin/site-tasks?completions=1&date=${date}&pool_id=${poolId}`)
      .then(r => r.json()).then(d => setRows(d.completions ?? []))
  }, [date, poolId])

  // Group ticks by site, then by who did them
  const bySite = new Map<string, { name: string; rows: any[] }>()
  for (const r of rows ?? []) {
    const key = r.pool_id
    if (!bySite.has(key)) bySite.set(key, { name: r.pools?.name ?? 'Unknown site', rows: [] })
    bySite.get(key)!.rows.push(r)
  }
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne', hour: '2-digit', minute: '2-digit' })
  const who = (r: any) => r.staff ? `${r.staff.first_name} ${r.staff.last_name ?? ''}`.trim() : 'Unknown'

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
          <ClipboardCheck size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Tasks Done
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} style={{ width: '150px' }} />
          <select value={poolId} onChange={e => setPoolId(e.target.value)} style={{ width: '160px' }}>
            <option value="all">All sites</option>
            {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        What each technician ticked off, by site.
      </div>

      {rows === null ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>Nothing ticked off on this day{poolId !== 'all' ? ' at this site' : ''}.</div>
      ) : (
        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {[...bySite.values()].map(site => {
            const techs = [...new Set(site.rows.map(who))]
            return (
              <div key={site.name} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0 4px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{site.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{site.rows.length} done · {techs.join(', ')}</span>
                </div>
                {site.rows.map(r => (
                  <div key={r.id} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', padding: '5px 0', fontSize: '12px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: '#00b894', fontWeight: '700' }}>✓</span>
                    <span style={{ flex: 1, color: 'var(--text)' }}>{r.site_tasks?.label ?? '(task removed)'}</span>
                    <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{who(r)} · {fmtTime(r.completed_at)}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

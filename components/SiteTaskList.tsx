'use client'
import { useState, useEffect, useCallback } from 'react'
import { groupByCategory } from '@/lib/site-tasks'

// Technician tick list for one site — the admin-defined tasks, ticked per site per day.
export default function SiteTaskList({ poolId }: { poolId: string }) {
  const [tasks, setTasks] = useState<any[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetch(`/api/technician/site-tasks?pool_id=${poolId}`)
      .then(r => r.json())
      .then(d => setTasks(d.tasks ?? []))
      .catch(() => setTasks([]))
  }, [poolId])
  useEffect(() => { load() }, [load])

  async function toggle(task: any) {
    const done = !task.done
    // Optimistic tick so it feels instant on a phone
    setTasks(ts => (ts ?? []).map(t => t.id === task.id ? { ...t, done } : t))
    const res = await fetch('/api/technician/site-tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool_id: poolId, task_id: task.id, done }),
    })
    if (!res.ok) { setError('Could not save — check your connection'); load() }
    else setError('')
  }

  if (tasks === null || tasks.length === 0) return null

  const doneCount = tasks.filter(t => t.done).length
  const allDone = doneCount === tasks.length
  return (
    <div style={{ background: '#121f35', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: `1px solid ${allDone ? '#00b89440' : '#1a2d45'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Site Tasks · today</div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: allDone ? '#00b894' : '#94a3b8' }}>{doneCount}/{tasks.length}</div>
      </div>
      <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
        {groupByCategory(tasks).map(g => (
          <div key={g.category} style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 0' }}>{g.category}</div>
            {g.tasks.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 4px', cursor: 'pointer', borderBottom: '1px solid #1a2d45' }}>
                <input type="checkbox" checked={t.done} onChange={() => toggle(t)} style={{ width: '20px', height: '20px', accentColor: '#00b894', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '14px', color: t.done ? '#64748b' : '#e2e8f0', textDecoration: t.done ? 'line-through' : 'none' }}>{t.label}</span>
                {t.done && t.completed_by && <span style={{ fontSize: '11px', color: '#64748b', flexShrink: 0 }}>{t.completed_by}</span>}
              </label>
            ))}
          </div>
        ))}
      </div>
      {error && <div style={{ color: '#d63031', fontSize: '12px', marginTop: '8px' }}>{error}</div>}
    </div>
  )
}

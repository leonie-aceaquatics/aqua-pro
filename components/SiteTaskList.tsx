'use client'
import { useState, useEffect, useCallback } from 'react'
import { Camera } from 'lucide-react'
import { groupByCategory } from '@/lib/site-tasks'
import AttachmentPanel from './AttachmentPanel'

// Technician tick list for one site — the admin-defined tasks, ticked per site per day.
export default function SiteTaskList({ poolId }: { poolId: string }) {
  const [tasks, setTasks] = useState<any[] | null>(null)
  const [error, setError] = useState('')
  const [photosOpen, setPhotosOpen] = useState<string | null>(null)   // task id whose photo panel is expanded

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
    else {
      setError('')
      load()   // pick up the completion id so photos can attach to this tick
      if (done && task.photos_required > 0) setPhotosOpen(task.id)
      if (!done && photosOpen === task.id) setPhotosOpen(null)
    }
  }

  if (tasks === null || tasks.length === 0) return null

  const doneCount = tasks.filter(t => t.done).length
  const allDone = doneCount === tasks.length
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: `1px solid ${allDone ? '#00b89440' : 'var(--border)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Site Tasks · today</div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: allDone ? '#00b894' : '#94a3b8' }}>{doneCount}/{tasks.length}</div>
      </div>
      <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
        {groupByCategory(tasks).map(g => (
          <div key={g.category} style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 0' }}>{g.category}</div>
            {g.tasks.map(t => {
              const needsPhotos = (t.photos_required ?? 0) > 0
              const photosShort = needsPhotos && t.done && (t.photo_count ?? 0) < t.photos_required
              return (
                <div key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={t.done} onChange={() => toggle(t)} style={{ width: '20px', height: '20px', accentColor: '#00b894', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '14px', color: t.done && !photosShort ? '#64748b' : '#e2e8f0', textDecoration: t.done && !photosShort ? 'line-through' : 'none' }}>{t.label}</span>
                    {t.done && t.completed_by && <span style={{ fontSize: '11px', color: '#64748b', flexShrink: 0 }}>{t.completed_by}</span>}
                  </label>
                  {needsPhotos && (
                    <button type="button" onClick={() => t.done && setPhotosOpen(o => o === t.id ? null : t.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', margin: '-4px 0 8px', padding: '8px 10px', borderRadius: '8px', cursor: t.done ? 'pointer' : 'default',
                        background: photosShort ? '#e1705518' : t.done ? '#00b89418' : 'var(--surface)',
                        border: `1px solid ${photosShort ? '#e1705560' : t.done ? '#00b89440' : 'var(--border)'}`,
                        color: photosShort ? '#e17055' : t.done ? '#00b894' : '#64748b', fontSize: '12px', fontWeight: '700', textAlign: 'left' }}>
                      <Camera size={14} />
                      {t.done
                        ? `${t.photo_count ?? 0} of ${t.photos_required} photo${t.photos_required === 1 ? '' : 's'} added${photosShort ? ' — tap to add' : ''}`
                        : `Needs ${t.photos_required} photo${t.photos_required === 1 ? '' : 's'} — tick the task first, then add them`}
                    </button>
                  )}
                  {needsPhotos && t.done && t.completion_id && photosOpen === t.id && (
                    <div style={{ padding: '0 4px 10px' }} onClick={e => e.stopPropagation()}>
                      <AttachmentPanel entityType="site_task_completion" entityId={t.completion_id} onChange={load} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {error && <div style={{ color: '#d63031', fontSize: '12px', marginTop: '8px' }}>{error}</div>}
    </div>
  )
}

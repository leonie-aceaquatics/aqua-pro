'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { fmtTime, fmtActual, hoursBetween } from '@/lib/shift-time'

// Admin roster, one block per day: who is going where (in time order) and which sites have
// nobody rostered — so a glance shows whether the day is covered.

const TZ = 'Australia/Melbourne'
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })   // YYYY-MM-DD in Melbourne
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ })

// Monday of the week containing the given YYYY-MM-DD
function mondayOf(key: string): string {
  const d = new Date(key + 'T12:00:00')
  const dow = (d.getDay() + 6) % 7   // Mon=0
  d.setDate(d.getDate() - dow)
  return d.toISOString().slice(0, 10)
}
function addDays(key: string, n: number): string {
  const d = new Date(key + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}
const fmtDay = (key: string) => new Date(key + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })

const TYPE_COLOUR: Record<string, string> = {
  service_visit: '#00b4d8', repair: '#e17055', chemical_delivery: '#00b894',
  inspection: '#fdcb6e', office: '#64748b', emergency: '#d63031',
}
const STATUS_COLOUR: Record<string, string> = { completed: '#00b894', cancelled: '#d63031', in_progress: '#fdcb6e', no_show: '#d63031' }

export default function ShiftsByDay({ shifts, pools, loading, onEdit }: { shifts: any[]; pools: any[]; loading: boolean; onEdit: (sh: any) => void }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayKey()))
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = addDays(weekStart, 6)

  const inWeek = shifts.filter(sh => { const k = dayKey(sh.scheduled_start); return k >= weekStart && k <= weekEnd })
  const byDay = new Map<string, any[]>()
  for (const sh of inWeek) { const k = dayKey(sh.scheduled_start); byDay.set(k, [...(byDay.get(k) ?? []), sh]) }

  // Hours actually worked this week, per technician
  const hours = inWeek.reduce((acc: Record<string, number>, sh: any) => {
    if (!sh.actual_end) return acc
    const name = sh.staff ? `${sh.staff.first_name} ${sh.staff.last_name}` : 'Unknown'
    acc[name] = (acc[name] ?? 0) + hoursBetween(sh.actual_start, sh.actual_end)
    return acc
  }, {})

  const who = (sh: any) => sh.staff ? `${sh.staff.first_name} ${sh.staff.last_name}` : 'Unassigned'
  const sortedPools = [...pools].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))

  return (
    <div>
      {/* Week picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button type="button" className="btn btn-secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={14} /> Prev week</button>
        <div style={{ fontWeight: '700', color: 'var(--text)' }}>
          Week of {new Date(weekStart + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next week <ChevronRight size={14} /></button>
        <button type="button" className="btn btn-secondary" onClick={() => setWeekStart(mondayOf(todayKey()))}>This week</button>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{inWeek.length} shift{inWeek.length === 1 ? '' : 's'} · click a shift to edit</span>
      </div>

      {Object.keys(hours).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          <span style={{ fontWeight: '700', color: 'var(--text)' }}><Clock size={12} style={{ verticalAlign: '-2px', marginRight: '4px' }} />Hours on site this week:</span>
          {Object.entries(hours).map(([name, hrs]) => <span key={name}>{name}: <strong style={{ color: 'var(--aqua)' }}>{hrs.toFixed(1)} h</strong></span>)}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</div>
      ) : days.map(day => {
        const list = (byDay.get(day) ?? []).sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
        const isToday = day === todayKey()
        // Which sites have someone rostered today (facility sites like a gym count too)
        const coveredBy = new Map<string, string[]>()
        for (const sh of list) if (sh.pool_id && sh.status !== 'cancelled') coveredBy.set(sh.pool_id, [...(coveredBy.get(sh.pool_id) ?? []), sh.staff?.first_name ?? '?'])
        const uncovered = sortedPools.filter(p => !coveredBy.has(p.id))
        return (
          <div key={day} className="card" style={{ marginBottom: '14px', padding: '16px', borderColor: isToday ? 'var(--aqua)' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: list.length ? '10px' : 0 }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: isToday ? 'var(--aqua)' : 'var(--text)' }}>
                {fmtDay(day)}{isToday ? ' · today' : ''}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {list.length === 0 ? 'Nobody rostered' : `${list.length} shift${list.length === 1 ? '' : 's'} · ${coveredBy.size} of ${pools.length} sites covered`}
              </div>
            </div>

            {list.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', alignItems: 'flex-start' }}>
                {/* Who's going where */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Who's going where</div>
                  {list.map(sh => (
                    <div key={sh.id} onClick={() => onEdit(sh)}
                      style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: '10px', alignItems: 'center', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', background: 'var(--surface-2)', marginBottom: '4px', opacity: sh.status === 'cancelled' ? 0.5 : 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>{fmtTime(sh.scheduled_start)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                          <strong>{who(sh)}</strong> → {sh.pools?.name ?? 'Office / Admin'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {sh.shift_type !== 'service_visit' && <span style={{ color: TYPE_COLOUR[sh.shift_type] ?? 'var(--text-muted)', fontWeight: '700' }}>{sh.shift_type.replace('_', ' ')}</span>}
                          {sh.actual_start && <span style={{ color: sh.actual_end ? 'var(--text-muted)' : 'var(--aqua)' }}>{fmtActual(sh)}</span>}
                          {sh.notes && <span style={{ fontStyle: 'italic' }}>{sh.notes}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.3px',
                        color: STATUS_COLOUR[sh.status] ?? 'var(--aqua)', background: (STATUS_COLOUR[sh.status] ?? '#00b4d8') + '20' }}>
                        {sh.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Site coverage */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Site coverage</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {sortedPools.filter(p => coveredBy.has(p.id)).map(p => (
                      <span key={p.id} style={{ fontSize: '11px', padding: '4px 9px', borderRadius: '99px', background: '#00b89418', border: '1px solid #00b89440', color: '#00b894' }}>
                        {p.name} · <strong>{[...new Set(coveredBy.get(p.id))].join(', ')}</strong>
                      </span>
                    ))}
                    {uncovered.map(p => (
                      <span key={p.id} style={{ fontSize: '11px', padding: '4px 9px', borderRadius: '99px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>Green = someone rostered. Grey = nobody today.</div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

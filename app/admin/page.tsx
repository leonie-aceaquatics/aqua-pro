'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Droplets, Users, ClipboardList, Package,
  AlertTriangle, Wifi, BarChart2, LogOut, Plus,
  Activity, Shield, MapPin, Bell, FlaskConical,
  XCircle, Wrench, CalendarX, Check, Trash2, Bug,
  ChevronUp, ChevronDown, Pencil, Power,
  TestTube, Calculator, ListChecks, FileText,
} from 'lucide-react'
import { RISK_COLOURS, RISK_LABELS, calculateLSI, classifyLSI, LSI_LABELS } from '@/lib/water-chemistry'
import { toLocalInput, localInputToISO } from '@/lib/local-time'
import ReportIssueButton from '@/components/ReportIssueButton'
import PoolContacts from '@/components/PoolContacts'
import AttachmentPanel from '@/components/AttachmentPanel'
import MicrobiologyTab from '@/components/MicrobiologyTab'
import RiskRegisterTab from '@/components/RiskRegisterTab'
import ChemistryCalculatorTab from '@/components/ChemistryCalculatorTab'
import WqrmpTab from '@/components/WqrmpTab'

type Tab = 'overview' | 'pools' | 'water-testing' | 'microbiology' | 'chemistry-calc' | 'staff' | 'checklists' | 'assets' | 'compliance' | 'risk' | 'risk-register' | 'remote-sites' | 'chemicals' | 'closures' | 'wqrmp' | 'errors'

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',      label: 'Overview',       icon: BarChart2 },
  { id: 'pools',         label: 'Pools',          icon: Droplets },
  { id: 'water-testing', label: 'Water Testing',  icon: Activity },
  { id: 'microbiology',  label: 'Microbiology',   icon: TestTube },
  { id: 'chemistry-calc', label: 'Chemistry Calculator', icon: Calculator },
  { id: 'staff',         label: 'Staff & Shifts',  icon: Users },
  { id: 'checklists',    label: 'Checklists',     icon: ClipboardList },
  { id: 'assets',        label: 'Asset Register', icon: Package },
  { id: 'compliance',    label: 'Compliance',     icon: Shield },
  { id: 'chemicals',     label: 'Chemicals',      icon: FlaskConical },
  { id: 'closures',      label: 'Pool Closures',  icon: XCircle },
  { id: 'risk',          label: 'Risk',           icon: AlertTriangle },
  { id: 'risk-register', label: 'Risk Register',  icon: ListChecks },
  { id: 'remote-sites',  label: 'Remote Sites',   icon: Wifi },
  { id: 'wqrmp',         label: 'WQRMP Reports',  icon: FileText },
  { id: 'errors',        label: 'Error Log',      icon: Bug },
]

// ── Shared style objects ───────────────────────────────────────────────────────
const s = {
  page: { display: 'flex', minHeight: '100vh' } as React.CSSProperties,
  sidebar: {
    width: '220px', flexShrink: 0,
    background: '#0d1829', borderRight: '1px solid #1a2d45',
    display: 'flex', flexDirection: 'column' as const,
    position: 'sticky' as const, top: 0, height: '100vh', overflow: 'hidden',
  } as React.CSSProperties,
  logo: {
    padding: '20px 16px',
    borderBottom: '1px solid #1a2d45',
    display: 'flex', alignItems: 'center', gap: '10px',
  } as React.CSSProperties,
  logoIcon: {
    width: '32px', height: '32px',
    background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
  } as React.CSSProperties,
  nav: { flex: 1, padding: '12px 8px', overflowY: 'auto' as const },
  navBtn: (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
    background: active ? '#00b4d820' : 'transparent',
    color: active ? '#00b4d8' : '#64748b',
    marginBottom: '2px', textAlign: 'left' as const,
    transition: 'all 0.15s',
  }),
  main: { flex: 1, overflow: 'auto', padding: '28px' } as React.CSSProperties,
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '24px',
  } as React.CSSProperties,
  pageTitle: { fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 } as React.CSSProperties,
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' } as React.CSSProperties,
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' } as React.CSSProperties,
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' } as React.CSSProperties,
  formGroup: { marginBottom: '16px' } as React.CSSProperties,
  sectionTitle: { fontSize: '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '16px' } as React.CSSProperties,
  badge: (colour: string): React.CSSProperties => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: '99px',
    fontSize: '11px', fontWeight: '700',
    background: colour + '20', color: colour, border: `1px solid ${colour}40`,
  }),
  riskBadge: (level: string): React.CSSProperties => {
    const c = RISK_COLOURS[level as keyof typeof RISK_COLOURS] ?? '#64748b'
    return {
      display: 'inline-block', padding: '3px 10px', borderRadius: '99px',
      fontSize: '11px', fontWeight: '700',
      background: c + '20', color: c, border: `1px solid ${c}40`,
    }
  },
  row: { display: 'flex', alignItems: 'center', gap: '10px' } as React.CSSProperties,
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState({
    totalPools: 0, redPools: 0, orangePools: 0,
    todayTests: 0, openIncidents: 0, assetsOverdue: 0,
    complianceDue: 0, activeTechnicians: 0,
  })
  const [recentTests, setRecentTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/reporting').then(r => r.json()),
      fetch('/api/admin/water-tests?limit=8').then(r => r.json()),
    ]).then(([s, t]) => {
      setStats(s.stats ?? stats)
      setRecentTests(t.tests ?? [])
      setLoading(false)
    })
  }, [])

  const statTiles = [
    { label: 'Total Pools', value: stats.totalPools, colour: '#00b4d8' },
    { label: 'Red Alert Pools', value: stats.redPools, colour: '#d63031' },
    { label: 'Action Required', value: stats.orangePools, colour: '#e17055' },
    { label: "Today's Tests", value: stats.todayTests, colour: '#00b894' },
    { label: 'Open Incidents', value: stats.openIncidents, colour: '#fdcb6e' },
    { label: 'Assets Overdue', value: stats.assetsOverdue, colour: '#e17055' },
    { label: 'Compliance Due', value: stats.complianceDue, colour: '#fdcb6e' },
    { label: 'Active Technicians', value: stats.activeTechnicians, colour: '#00b4d8' },
  ]

  return (
    <>
      <div style={{ ...s.grid4, gridTemplateColumns: 'repeat(4,1fr)' }}>
        {statTiles.slice(0, 4).map(t => (
          <div className="stat-tile" key={t.label}>
            <div className="stat-value" style={{ color: t.colour }}>{loading ? '—' : t.value}</div>
            <div className="stat-label">{t.label}</div>
          </div>
        ))}
      </div>
      <div style={{ ...s.grid4, gridTemplateColumns: 'repeat(4,1fr)' }}>
        {statTiles.slice(4).map(t => (
          <div className="stat-tile" key={t.label}>
            <div className="stat-value" style={{ color: t.colour }}>{loading ? '—' : t.value}</div>
            <div className="stat-label">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={s.sectionTitle}>Recent Water Tests</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pool</th><th>Tested</th><th>FC</th><th>pH</th>
                <th>TA</th><th>Risk</th><th>Technician</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>Loading…</td></tr>
              ) : recentTests.length === 0 ? (
                <tr><td colSpan={7} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No tests recorded yet</td></tr>
              ) : recentTests.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: '600' }}>{t.pools?.name ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(t.tested_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</td>
                  <td>{t.free_chlorine ?? '—'}</td>
                  <td>{t.ph ?? '—'}</td>
                  <td>{t.total_alkalinity ?? '—'}</td>
                  <td><span style={s.riskBadge(t.risk_level)}>{RISK_LABELS[t.risk_level as keyof typeof RISK_LABELS] ?? t.risk_level}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{t.staff ? `${t.staff.first_name} ${t.staff.last_name}` : t.test_source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── POOLS TAB ─────────────────────────────────────────────────────────────────
const BLANK_POOL_FORM = {
  name: '', site_code: '', address: '', suburb: '', state: 'VIC', postcode: '',
  pool_type: 'outdoor', sanitiser_type: 'chlorine', volume_litres: '',
  surface_area_m2: '', max_bather_load: '', owner_name: '', owner_email: '',
  owner_phone: '', is_commercial: false, health_licence_number: '',
  licence_expiry: '', notes: '',
  ph_correction_method: 'acid', close_threshold_free_chlorine: '', close_threshold_ph_low: '', close_threshold_ph_high: '',
}

function PoolsTab() {
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPool, setEditingPool] = useState<any>(null)
  const [form, setForm] = useState(BLANK_POOL_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    fetch('/api/admin/pools').then(r => r.json()).then(d => {
      setPools(d.pools ?? [])
      setLoading(false)
    })
  }, [])
  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingPool(null)
    setForm(BLANK_POOL_FORM)
    setShowModal(true)
  }

  function openEdit(pool: any) {
    setEditingPool(pool)
    setForm({
      name: pool.name ?? '', site_code: pool.site_code ?? '', address: pool.address ?? '',
      suburb: pool.suburb ?? '', state: pool.state ?? 'VIC', postcode: pool.postcode ?? '',
      pool_type: pool.pool_type ?? 'outdoor', sanitiser_type: pool.sanitiser_type ?? 'chlorine',
      volume_litres: pool.volume_litres ?? '', surface_area_m2: pool.surface_area_m2 ?? '',
      max_bather_load: pool.max_bather_load ?? '', owner_name: pool.owner_name ?? '',
      owner_email: pool.owner_email ?? '', owner_phone: pool.owner_phone ?? '',
      is_commercial: pool.is_commercial ?? false, health_licence_number: pool.health_licence_number ?? '',
      licence_expiry: pool.licence_expiry ?? '', notes: pool.notes ?? '',
      ph_correction_method: pool.ph_correction_method ?? 'acid',
      close_threshold_free_chlorine: pool.close_threshold_free_chlorine ?? '',
      close_threshold_ph_low: pool.close_threshold_ph_low ?? '',
      close_threshold_ph_high: pool.close_threshold_ph_high ?? '',
    })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/pools', {
      method: editingPool ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPool ? { id: editingPool.id, ...form } : form),
    })
    if (res.ok) { setShowModal(false); load() }
    setSaving(false)
  }

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Pool Register</div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Pool
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Pool Name</th><th>Type</th><th>Sanitiser</th>
              <th>Volume</th><th>Owner</th><th>Licence Expiry</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : pools.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No pools yet — add your first pool</td></tr>
            ) : pools.map((p: any) => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(p)}>
                <td><code style={{ color: 'var(--aqua)', fontSize: '12px' }}>{p.site_code}</code></td>
                <td style={{ fontWeight: '600' }}>
                  <div>{p.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.suburb}, {p.state}</div>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{p.pool_type}</td>
                <td style={{ textTransform: 'capitalize' }}>{p.sanitiser_type}</td>
                <td>{p.volume_litres ? `${Number(p.volume_litres).toLocaleString()} L` : '—'}</td>
                <td>
                  <div>{p.owner_name ?? '—'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.owner_email}</div>
                </td>
                <td style={{ color: p.licence_expiry && new Date(p.licence_expiry) < new Date() ? 'var(--red)' : 'var(--text-muted)' }}>
                  {p.licence_expiry ?? '—'}
                </td>
                <td>
                  <span style={s.badge(p.is_active ? '#00b894' : '#64748b')}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-title">{editingPool ? 'Edit Pool' : 'Add Pool'}</div>
            <form onSubmit={handleSave}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Pool Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Civic Centre Pool" />
                </div>
                <div style={s.formGroup}>
                  <label>Site Code *</label>
                  <input required value={form.site_code} onChange={e => setForm(f => ({ ...f, site_code: e.target.value }))} placeholder="e.g. AQ-001" />
                </div>
              </div>
              <div style={s.formGroup}>
                <label>Street Address *</label>
                <input required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div style={{ ...s.formGrid, gridTemplateColumns: '2fr 1fr 1fr' }}>
                <div style={s.formGroup}>
                  <label>Suburb</label>
                  <input value={form.suburb} onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>State</label>
                  <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                    {['VIC','NSW','QLD','WA','SA','TAS','ACT','NT'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label>Postcode</label>
                  <input value={form.postcode} onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))} />
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Pool Type *</label>
                  <select required value={form.pool_type} onChange={e => setForm(f => ({ ...f, pool_type: e.target.value }))}>
                    {['outdoor','indoor','spa','wading','hydrotherapy','leisure'].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label>Sanitiser Type *</label>
                  <select required value={form.sanitiser_type} onChange={e => setForm(f => ({ ...f, sanitiser_type: e.target.value }))}>
                    {[
                      ['chlorine','Chlorine'],['bromine','Bromine'],['saltwater','Saltwater'],
                      ['uv_chlorine','UV + Chlorine'],['ozone_chlorine','Ozone + Chlorine'],['baquacil','Baquacil'],
                    ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Volume (Litres)</label>
                  <input type="number" value={form.volume_litres} onChange={e => setForm(f => ({ ...f, volume_litres: e.target.value }))} placeholder="50000" />
                </div>
                <div style={s.formGroup}>
                  <label>Max Bather Load</label>
                  <input type="number" value={form.max_bather_load} onChange={e => setForm(f => ({ ...f, max_bather_load: e.target.value }))} />
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Owner Name</label>
                  <input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>Owner Email</label>
                  <input type="email" value={form.owner_email} onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))} />
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Health Licence Number</label>
                  <input value={form.health_licence_number} onChange={e => setForm(f => ({ ...f, health_licence_number: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>Licence Expiry</label>
                  <input type="date" value={form.licence_expiry} onChange={e => setForm(f => ({ ...f, licence_expiry: e.target.value }))} />
                </div>
              </div>
              <div style={s.formGroup}>
                <label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div style={{ ...s.sectionTitle, fontSize: '13px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                Water Chemistry Settings
              </div>
              <div style={s.formGroup}>
                <label>pH Correction Method</label>
                <select value={form.ph_correction_method} onChange={e => setForm(f => ({ ...f, ph_correction_method: e.target.value }))}>
                  <option value="acid">Acid (Muriatic / Hydrochloric)</option>
                  <option value="co2">CO₂ Injection</option>
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Determines the dosing chemical suggested when pH is high, in both the water test form and the Chemistry Calculator.
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '10px 0 4px' }}>
                Site closure thresholds — leave blank to use the standard defaults (FC &lt; 0.5, pH outside 6.8–8.2)
              </div>
              <div style={{ ...s.formGrid, gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div style={s.formGroup}>
                  <label>Close if FC below</label>
                  <input type="number" step="0.1" value={form.close_threshold_free_chlorine} onChange={e => setForm(f => ({ ...f, close_threshold_free_chlorine: e.target.value }))} placeholder="0.5" />
                </div>
                <div style={s.formGroup}>
                  <label>Close if pH below</label>
                  <input type="number" step="0.1" value={form.close_threshold_ph_low} onChange={e => setForm(f => ({ ...f, close_threshold_ph_low: e.target.value }))} placeholder="6.8" />
                </div>
                <div style={s.formGroup}>
                  <label>Close if pH above</label>
                  <input type="number" step="0.1" value={form.close_threshold_ph_high} onChange={e => setForm(f => ({ ...f, close_threshold_ph_high: e.target.value }))} placeholder="8.2" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingPool ? 'Save Changes' : 'Add Pool'}</button>
              </div>
            </form>
            {editingPool && <PoolContacts poolId={editingPool.id} />}
          </div>
        </div>
      )}
    </>
  )
}

// ── WATER TESTING TAB ─────────────────────────────────────────────────────────
function WaterTestingTab() {
  const [tests, setTests] = useState<any[]>([])
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedTest, setSelectedTest] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [filterPool, setFilterPool] = useState('')
  const [filterRisk, setFilterRisk] = useState('')
  const [form, setForm] = useState({
    pool_id: '', tested_at: toLocalInput(),
    free_chlorine: '', combined_chlorine: '', total_chlorine: '', ph: '',
    total_alkalinity: '', calcium_hardness: '', cyanuric_acid: '',
    total_dissolved_solids: '', salt_level: '', phosphates: '',
    temperature_c: '', turbidity: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    const q = new URLSearchParams()
    if (filterPool) q.set('pool_id', filterPool)
    if (filterRisk) q.set('risk_level', filterRisk)
    Promise.all([
      fetch(`/api/admin/water-tests?${q}`).then(r => r.json()),
      fetch('/api/admin/pools').then(r => r.json()),
    ]).then(([t, p]) => {
      setTests(t.tests ?? [])
      setPools(p.pools ?? [])
      setLoading(false)
    })
  }, [filterPool, filterRisk])
  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload: Record<string, any> = { ...form, tested_at: localInputToISO(form.tested_at) }
    // Convert empty strings to null for numeric fields
    const numFields = ['free_chlorine','combined_chlorine','total_chlorine','ph','total_alkalinity','calcium_hardness',
      'cyanuric_acid','total_dissolved_solids','salt_level','phosphates','temperature_c','turbidity']
    numFields.forEach(f => { if (payload[f] === '') payload[f] = null })
    const res = await fetch('/api/admin/water-tests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (res.ok) { setShowModal(false); load(); setSelectedTest(data.test) }
    setSaving(false)
  }

  async function getAiAdvice(test: any) {
    setAiLoading(true)
    const res = await fetch('/api/ai/water-advice', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId: test.id }),
    })
    const data = await res.json()
    setSelectedTest((prev: any) => ({ ...prev, ai_advice: data.advice }))
    setAiLoading(false)
  }

  const numField = (key: string, label: string, placeholder: string) => (
    <div style={s.formGroup}>
      <label>{label}</label>
      <input type="number" step="0.01" placeholder={placeholder}
        value={form[key as keyof typeof form] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </div>
  )

  // Combined chlorine = total - free (DPD3 - DPD1); shown read-only, computed on the server too
  const combinedChlorine = form.free_chlorine !== '' && form.total_chlorine !== ''
    ? Math.max(0, Math.round((Number(form.total_chlorine) - Number(form.free_chlorine)) * 100) / 100).toFixed(2)
    : ''

  // LSI = pH + temp + calcium + alkalinity factors − TDS constant; needs all four, CYA/TDS refine it
  const lsiInputs = [form.ph, form.temperature_c, form.calcium_hardness, form.total_alkalinity]
  const lsi = lsiInputs.every(v => v !== '')
    ? calculateLSI(Number(form.ph), Number(form.temperature_c), Number(form.calcium_hardness), Number(form.total_alkalinity), {
        cyanuricAcid: form.cyanuric_acid !== '' ? Number(form.cyanuric_acid) : undefined,
        tds: form.total_dissolved_solids !== '' ? Number(form.total_dissolved_solids) : undefined,
      })
    : null
  const lsiStatus = lsi !== null ? classifyLSI(lsi) : null
  const lsiColour = lsiStatus === 'balanced' ? 'var(--green)' : lsiStatus ? 'var(--orange)' : 'var(--text-dim)'

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Water Testing</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Log Water Test
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <select value={filterPool} onChange={e => setFilterPool(e.target.value)} style={{ width: '220px' }}>
          <option value="">All Pools</option>
          {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} style={{ width: '180px' }}>
          <option value="">All Risk Levels</option>
          {['green','yellow','orange','red'].map(r => <option key={r} value={r}>{RISK_LABELS[r as keyof typeof RISK_LABELS]}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pool</th><th>Date / Time</th><th>FC</th><th>pH</th><th>TA</th>
              <th>CH</th><th>CYA</th><th>Temp</th><th>Risk</th><th>Source</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : tests.length === 0 ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No tests recorded yet</td></tr>
            ) : tests.map((t: any) => (
              <tr key={t.id}>
                <td style={{ fontWeight: '600' }}>{t.pools?.name ?? '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  {new Date(t.tested_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
                </td>
                <td>{t.free_chlorine ?? '—'}</td>
                <td style={{ color: t.ph && (t.ph < 7.2 || t.ph > 7.6) ? 'var(--red)' : 'inherit' }}>
                  {t.ph ?? '—'}
                </td>
                <td>{t.total_alkalinity ?? '—'}</td>
                <td>{t.calcium_hardness ?? '—'}</td>
                <td>{t.cyanuric_acid ?? '—'}</td>
                <td>{t.temperature_c ? `${t.temperature_c}°C` : '—'}</td>
                <td>
                  <span style={s.riskBadge(t.risk_level ?? 'green')}>
                    {RISK_LABELS[t.risk_level as keyof typeof RISK_LABELS] ?? '—'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', textTransform: 'capitalize', fontSize: '12px' }}>
                  {t.test_source}
                </td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => setSelectedTest(t)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log test modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-title">Log Water Test</div>
            <form onSubmit={handleSave}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Pool *</label>
                  <select required value={form.pool_id} onChange={e => setForm(f => ({ ...f, pool_id: e.target.value }))}>
                    <option value="">— Select Pool —</option>
                    {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label>Date / Time *</label>
                  <input type="datetime-local" required value={form.tested_at}
                    onChange={e => setForm(f => ({ ...f, tested_at: e.target.value }))} />
                </div>
              </div>
              <div style={{ background: '#121f35', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Sanitiser
                </div>
                <div style={{ ...s.formGrid, gridTemplateColumns: 'repeat(4,1fr)' }}>
                  {numField('free_chlorine', 'Free Chlorine (ppm)', '2.0')}
                  {numField('total_chlorine', 'Total Chlorine (ppm)', '2.5')}
                  <div style={s.formGroup}>
                    <label>Combined Chlorine (ppm) · auto</label>
                    <input type="number" readOnly tabIndex={-1} value={combinedChlorine} placeholder="Total − Free"
                      style={{ opacity: 0.7, cursor: 'default' }} />
                  </div>
                  {numField('bromine', 'Bromine (ppm)', '4.0')}
                </div>
              </div>
              <div style={{ background: '#121f35', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Balance
                </div>
                <div style={{ ...s.formGrid, gridTemplateColumns: 'repeat(3,1fr)' }}>
                  {numField('ph', 'pH', '7.4')}
                  {numField('total_alkalinity', 'Total Alkalinity (ppm)', '100')}
                  {numField('calcium_hardness', 'Calcium Hardness (ppm)', '300')}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '12px', padding: '10px 12px', background: '#0d1829', borderRadius: '8px', border: `1px solid ${lsiStatus && lsiStatus !== 'balanced' ? '#e1705540' : '#1a2d45'}` }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LSI · auto</span>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: lsiColour }}>{lsi !== null ? (lsi > 0 ? `+${lsi.toFixed(2)}` : lsi.toFixed(2)) : '—'}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {lsiStatus ? LSI_LABELS[lsiStatus] : 'Needs pH, alkalinity, calcium hardness and temperature'}
                  </span>
                </div>
              </div>
              <div style={{ background: '#121f35', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Other Parameters
                </div>
                <div style={{ ...s.formGrid, gridTemplateColumns: 'repeat(3,1fr)' }}>
                  {numField('cyanuric_acid', 'Cyanuric Acid (ppm)', '40')}
                  {numField('salt_level', 'Salt Level (ppm)', '3000')}
                  {numField('total_dissolved_solids', 'TDS (ppm)', '1500')}
                  {numField('phosphates', 'Phosphates (ppb)', '0')}
                  {numField('temperature_c', 'Temp (°C)', '28')}
                  {numField('turbidity', 'Turbidity (NTU)', '0')}
                </div>
              </div>
              <div style={s.formGroup}>
                <label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Log Test'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test detail / AI advice panel */}
      {selectedTest && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelectedTest(null) }}>
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div className="modal-title" style={{ margin: '0 0 4px' }}>{selectedTest.pools?.name ?? 'Water Test'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  {new Date(selectedTest.tested_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
                </div>
              </div>
              <span style={s.riskBadge(selectedTest.risk_level ?? 'green')}>
                {RISK_LABELS[selectedTest.risk_level as keyof typeof RISK_LABELS] ?? 'Unknown'}
              </span>
            </div>

            {/* Parameter grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '24px' }}>
              {[
                ['Free Chlorine', selectedTest.free_chlorine, 'ppm', 1.0, 3.0],
                ['Combined Cl', selectedTest.combined_chlorine, 'ppm', 0, 0.2],
                ['Total Cl', selectedTest.total_chlorine, 'ppm', 0, 4.0],
                ['pH', selectedTest.ph, '', 7.2, 7.6],
                ['Total Alkalinity', selectedTest.total_alkalinity, 'ppm', 80, 120],
                ['Calcium Hardness', selectedTest.calcium_hardness, 'ppm', 200, 400],
                ['CYA', selectedTest.cyanuric_acid, 'ppm', 30, 50],
                ['Salt', selectedTest.salt_level, 'ppm', 2700, 3400],
                ['TDS', selectedTest.total_dissolved_solids, 'ppm', 0, 3000],
                ['Phosphates', selectedTest.phosphates, 'ppb', 0, 100],
                ['Temperature', selectedTest.temperature_c, '°C', null, null],
                ['Turbidity', selectedTest.turbidity, 'NTU', 0, 0.5],
                ['LSI', selectedTest.langelier_saturation_index, '', -0.3, 0.3],
              ].filter(([,v]) => v !== null && v !== undefined).map(([label, val, unit, min, max]) => {
                const isOut = min !== null && max !== null && (Number(val) < Number(min) || Number(val) > Number(max))
                return (
                  <div key={label as string} style={{
                    background: '#121f35', borderRadius: '8px', padding: '12px',
                    border: `1px solid ${isOut ? '#d6303140' : '#1a2d45'}`,
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label as string}</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: isOut ? 'var(--red)' : 'var(--text)' }}>
                      {val}{unit}
                    </div>
                    {min !== null && max !== null && (
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>target: {min}–{max}</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* AI Advice */}
            <div style={{ borderTop: '1px solid #1a2d45', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontWeight: '700', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="var(--aqua)" />
                  AI Water Chemistry Advice
                </div>
                {!selectedTest.ai_advice && (
                  <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }}
                    onClick={() => getAiAdvice(selectedTest)} disabled={aiLoading}>
                    {aiLoading ? 'Generating…' : 'Get AI Advice'}
                  </button>
                )}
              </div>
              {selectedTest.ai_advice ? (
                <div style={{
                  background: '#121f35', borderRadius: '8px', padding: '16px',
                  border: '1px solid #1a2d45', color: 'var(--text)',
                  fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap',
                }}>
                  {selectedTest.ai_advice}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Click &ldquo;Get AI Advice&rdquo; to generate a step-by-step rebalancing plan for this test.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedTest(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── STAFF & SHIFTS TAB ────────────────────────────────────────────────────────
function StaffTab() {
  const [tab, setSubTab] = useState<'shifts' | 'staff' | 'routes' | 'unavailability'>('shifts')
  const [shifts, setShifts] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [pools, setPools] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [unavailability, setUnavailability] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddShift, setShowAddShift] = useState(false)
  const [editingShift, setEditingShift] = useState<any>(null)
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [editingRoute, setEditingRoute] = useState<any>(null)
  const [selectedRoute, setSelectedRoute] = useState<any>(null)
  const [showAddPool, setShowAddPool] = useState(false)
  const [showAddUnavail, setShowAddUnavail] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaffMember, setEditingStaffMember] = useState<any>(null)
  const [form, setForm] = useState({
    staff_id: '', pool_id: '', shift_type: 'service_visit',
    scheduled_start: '', scheduled_end: '', notes: '', status: 'scheduled',
  })
  const [routeForm, setRouteForm] = useState({ name: '', assigned_technician_id: '', notes: '' })
  const [routePoolForm, setRoutePoolForm] = useState({ pool_id: '', service_frequency: 'weekly' })
  const [unavailForm, setUnavailForm] = useState({ staff_id: '', start_date: '', end_date: '', reason: '' })
  const [staffForm, setStaffForm] = useState({
    email: '', password: '', first_name: '', last_name: '', role: 'technician', phone: '', is_active: true,
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/admin/shifts').then(r => r.json()),
      fetch('/api/admin/staff').then(r => r.json()),
      fetch('/api/admin/pools').then(r => r.json()),
      fetch('/api/admin/routes').then(r => r.json()),
      fetch('/api/admin/unavailability').then(r => r.json()),
    ]).then(([sh, st, p, ro, un]) => {
      setShifts(sh.shifts ?? [])
      setStaff(st.staff ?? [])
      setPools(p.pools ?? [])
      setRoutes(ro.routes ?? [])
      setUnavailability(un.unavailability ?? [])
      setLoading(false)
    })
  }, [])
  useEffect(() => { load() }, [load])

  function openAddShift() {
    setEditingShift(null)
    setForm({ staff_id: '', pool_id: '', shift_type: 'service_visit', scheduled_start: '', scheduled_end: '', notes: '', status: 'scheduled' })
    setShowAddShift(true)
  }

  function openEditShift(sh: any) {
    setEditingShift(sh)
    setForm({
      staff_id: sh.staff_id ?? '', pool_id: sh.pool_id ?? '', shift_type: sh.shift_type ?? 'service_visit',
      scheduled_start: toLocalInput(sh.scheduled_start), scheduled_end: toLocalInput(sh.scheduled_end),
      notes: sh.notes ?? '', status: sh.status ?? 'scheduled',
    })
    setShowAddShift(true)
  }

  async function handleAddShift(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/shifts', {
      method: editingShift ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(editingShift ? { id: editingShift.id } : {}),
        ...form,
        scheduled_start: localInputToISO(form.scheduled_start),
        scheduled_end: localInputToISO(form.scheduled_end),
      }),
    })
    if (res.ok) { setShowAddShift(false); load() }
    setSaving(false)
  }

  function openAddStaff() {
    setEditingStaffMember(null)
    setStaffForm({ email: '', password: '', first_name: '', last_name: '', role: 'technician', phone: '', is_active: true })
    setShowStaffModal(true)
  }

  function openEditStaff(m: any) {
    setEditingStaffMember(m)
    setStaffForm({ email: m.email ?? '', password: '', first_name: m.first_name ?? '', last_name: m.last_name ?? '', role: m.role ?? 'technician', phone: m.phone ?? '', is_active: m.is_active ?? true })
    setShowStaffModal(true)
  }

  async function handleSaveStaff(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload: any = { ...staffForm }
    if (!payload.password) delete payload.password
    const res = await fetch('/api/admin/staff', {
      method: editingStaffMember ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingStaffMember ? { id: editingStaffMember.id, ...payload } : payload),
    })
    if (res.ok) { setShowStaffModal(false); load() }
    setSaving(false)
  }

  function openAddRoute() {
    setEditingRoute(null)
    setRouteForm({ name: '', assigned_technician_id: '', notes: '' })
    setShowAddRoute(true)
  }

  function openEditRoute(route: any) {
    setEditingRoute(route)
    setRouteForm({ name: route.name ?? '', assigned_technician_id: route.assigned_technician_id ?? '', notes: route.notes ?? '' })
    setShowAddRoute(true)
  }

  async function handleSaveRoute(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/routes', {
      method: editingRoute ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingRoute ? { id: editingRoute.id, ...routeForm } : routeForm),
    })
    if (res.ok) { setShowAddRoute(false); setRouteForm({ name: '', assigned_technician_id: '', notes: '' }); load() }
    setSaving(false)
  }

  async function moveRoutePool(route: any, poolId: string, direction: -1 | 1) {
    const sorted = [...(route.route_pools ?? [])].sort((a: any, b: any) => a.visit_order - b.visit_order)
    const idx = sorted.findIndex((rp: any) => rp.pool_id === poolId)
    const swapIdx = idx + direction
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx], b = sorted[swapIdx]
    await fetch(`/api/admin/routes/${route.id}/pools`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', pools: [{ pool_id: a.pool_id, visit_order: b.visit_order }, { pool_id: b.pool_id, visit_order: a.visit_order }] }),
    })
    load()
  }

  const shiftTypeColour: Record<string, string> = {
    service_visit: '#00b4d8', repair: '#e17055', chemical_delivery: '#00b894',
    inspection: '#fdcb6e', office: '#64748b', emergency: '#d63031',
  }

  const subTabs = [
    { id: 'shifts', label: 'Shifts' },
    { id: 'staff', label: 'Staff' },
    { id: 'routes', label: 'Routes' },
    { id: 'unavailability', label: 'Unavailability' },
  ]

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Staff & Scheduling</div>
        {tab === 'shifts' && (
          <button className="btn btn-primary" onClick={openAddShift}>
            <Plus size={16} /> Add Shift
          </button>
        )}
        {tab === 'staff' && (
          <button className="btn btn-primary" onClick={openAddStaff}>
            <Plus size={16} /> Add Staff
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--surface)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)} style={{
            padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600',
            background: tab === t.id ? 'var(--aqua)' : 'transparent',
            color: tab === t.id ? '#fff' : 'var(--text-muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'shifts' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Technician</th><th>Pool / Location</th><th>Type</th><th>Date</th><th>Time</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : shifts.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No shifts scheduled</td></tr>
              ) : shifts.map((sh: any) => (
                <tr key={sh.id} style={{ cursor: 'pointer' }} onClick={() => openEditShift(sh)}>
                  <td style={{ fontWeight: '600' }}>
                    {sh.staff ? `${sh.staff.first_name} ${sh.staff.last_name}` : '—'}
                  </td>
                  <td>{sh.pools?.name ?? 'Office / Admin'}</td>
                  <td>
                    <span style={s.badge(shiftTypeColour[sh.shift_type] ?? '#64748b')}>
                      {sh.shift_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {new Date(sh.scheduled_start).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(sh.scheduled_start).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(sh.scheduled_end).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <span style={s.badge(sh.status === 'completed' ? '#00b894' : sh.status === 'cancelled' ? '#d63031' : '#00b4d8')}>
                      {sh.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'staff' && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Last Login</th><th>Status</th></tr>
              </thead>
              <tbody>
                {staff.map((m: any) => {
                  const lastLogin = m.last_login_at ? new Date(m.last_login_at) : null
                  const staleLogin = lastLogin && (Date.now() - lastLogin.getTime()) > 1000 * 60 * 60 * 24 * 30
                  return (
                    <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => openEditStaff(m)}>
                      <td style={{ fontWeight: '600' }}>{m.first_name} {m.last_name}</td>
                      <td><span style={s.badge('#00b4d8')}>{m.role}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.email}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.phone ?? '—'}</td>
                      <td style={{ color: staleLogin ? 'var(--orange)' : 'var(--text-muted)', fontSize: '12px' }}>
                        {lastLogin ? lastLogin.toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}
                      </td>
                      <td><span style={s.badge(m.is_active ? '#00b894' : '#64748b')}>{m.is_active ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {showStaffModal && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowStaffModal(false) }}>
              <div className="modal" style={{ maxWidth: '480px' }}>
                <div className="modal-title">{editingStaffMember ? 'Edit Staff Member' : 'Add Staff Member'}</div>
                <form onSubmit={handleSaveStaff}>
                  <div style={s.formGrid}>
                    <div style={s.formGroup}>
                      <label>First Name *</label>
                      <input required value={staffForm.first_name} onChange={e => setStaffForm(f => ({ ...f, first_name: e.target.value }))} />
                    </div>
                    <div style={s.formGroup}>
                      <label>Last Name *</label>
                      <input required value={staffForm.last_name} onChange={e => setStaffForm(f => ({ ...f, last_name: e.target.value }))} />
                    </div>
                  </div>
                  <div style={s.formGroup}>
                    <label>Email *</label>
                    <input required type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div style={s.formGroup}>
                    <label>{editingStaffMember ? 'Reset Password (leave blank to keep current)' : 'Password *'}</label>
                    <input required={!editingStaffMember} type="password" value={staffForm.password} onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} />
                  </div>
                  <div style={s.formGrid}>
                    <div style={s.formGroup}>
                      <label>Role *</label>
                      <select required value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}>
                        {['admin','manager','technician','contractor','pool_manager'].map(r => (
                          <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div style={s.formGroup}>
                      <label>Phone</label>
                      <input value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                  {editingStaffMember && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px' }}>
                      <input type="checkbox" checked={staffForm.is_active} onChange={e => setStaffForm(f => ({ ...f, is_active: e.target.checked }))} />
                      <span style={{ fontSize: '13px', color: 'var(--text)' }}>Active</span>
                    </label>
                  )}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowStaffModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingStaffMember ? 'Save Changes' : 'Add Staff'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'routes' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={openAddRoute}>
              <Plus size={15} /> Add Route
            </button>
          </div>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', padding: '24px' }}>Loading…</div>
          ) : routes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <MapPin size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>No routes yet</div>
              <div style={{ fontSize: '13px' }}>Create named routes and assign pools in visit order to optimise technician travel.</div>
            </div>
          ) : routes.map((route: any) => (
            <div key={route.id} className="card" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: selectedRoute?.id === route.id ? '16px' : '0' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{route.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {route.technician ? `${route.technician.first_name} ${route.technician.last_name}` : 'No technician assigned'}
                    {' · '}
                    {(route.route_pools?.length ?? 0)} pool{route.route_pools?.length !== 1 ? 's' : ''}
                    {route.day_of_week?.length ? ` · ${route.day_of_week.map((d: number) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => setSelectedRoute(selectedRoute?.id === route.id ? null : route)}>
                    {selectedRoute?.id === route.id ? 'Collapse' : 'Manage Pools'}
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => openEditRoute(route)}>
                    Edit
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--red)' }}
                    onClick={async () => {
                      if (!confirm(`Delete route "${route.name}"?`)) return
                      await fetch('/api/admin/routes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: route.id }) })
                      load()
                    }}>
                    Delete
                  </button>
                </div>
              </div>
              {selectedRoute?.id === route.id && (
                <div>
                  <div style={{ borderTop: '1px solid #1a2d45', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>POOLS IN ROUTE (visit order)</div>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => setShowAddPool(true)}>
                        <Plus size={13} /> Add Pool
                      </button>
                    </div>
                    {(route.route_pools ?? []).length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>No pools assigned — add pools to define the visit order.</div>
                    ) : (() => {
                      const sortedPools = [...(route.route_pools ?? [])].sort((a: any, b: any) => a.visit_order - b.visit_order)
                      return sortedPools.map((rp: any, idx: number) => (
                        <div key={rp.pool_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #1a2d4530' }}>
                          <span style={{ width: '24px', height: '24px', borderRadius: '99px', background: 'var(--aqua)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{idx + 1}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600' }}>{rp.pools?.name ?? rp.pool_id}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rp.pools?.address} · {rp.service_frequency}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--text-dim)' : 'var(--text-muted)', padding: 0 }}
                              onClick={() => moveRoutePool(route, rp.pool_id, -1)}>
                              <ChevronUp size={16} />
                            </button>
                            <button disabled={idx === sortedPools.length - 1} style={{ background: 'none', border: 'none', cursor: idx === sortedPools.length - 1 ? 'default' : 'pointer', color: idx === sortedPools.length - 1 ? 'var(--text-dim)' : 'var(--text-muted)', padding: 0 }}
                              onClick={() => moveRoutePool(route, rp.pool_id, 1)}>
                              <ChevronDown size={16} />
                            </button>
                          </div>
                          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--red)' }}
                            onClick={async () => {
                              await fetch(`/api/admin/routes/${route.id}/pools`, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'remove', pool_id: rp.pool_id }),
                              })
                              load()
                            }}>
                            Remove
                          </button>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}

          {showAddRoute && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddRoute(false) }}>
              <div className="modal" style={{ maxWidth: '480px' }}>
                <div className="modal-title">{editingRoute ? 'Edit Service Route' : 'Add Service Route'}</div>
                <form onSubmit={handleSaveRoute}>
                  <div style={s.formGroup}>
                    <label>Route Name *</label>
                    <input required value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. North Route" />
                  </div>
                  <div style={s.formGroup}>
                    <label>Assigned Technician</label>
                    <select value={routeForm.assigned_technician_id} onChange={e => setRouteForm(f => ({ ...f, assigned_technician_id: e.target.value }))}>
                      <option value="">— Unassigned —</option>
                      {staff.filter(m => ['technician','contractor'].includes(m.role)).map(m => (
                        <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label>Notes</label>
                    <textarea rows={2} value={routeForm.notes} onChange={e => setRouteForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddRoute(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingRoute ? 'Save Changes' : 'Create Route'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showAddPool && selectedRoute && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddPool(false) }}>
              <div className="modal" style={{ maxWidth: '400px' }}>
                <div className="modal-title">Add Pool to {selectedRoute.name}</div>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  setSaving(true)
                  const nextOrder = (selectedRoute.route_pools?.length ?? 0) + 1
                  const res = await fetch(`/api/admin/routes/${selectedRoute.id}/pools`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...routePoolForm, visit_order: nextOrder }),
                  })
                  if (res.ok) { setShowAddPool(false); setRoutePoolForm({ pool_id: '', service_frequency: 'weekly' }); load() }
                  setSaving(false)
                }}>
                  <div style={s.formGroup}>
                    <label>Pool *</label>
                    <select required value={routePoolForm.pool_id} onChange={e => setRoutePoolForm(f => ({ ...f, pool_id: e.target.value }))}>
                      <option value="">— Select Pool —</option>
                      {pools.filter(p => !selectedRoute.route_pools?.some((rp: any) => rp.pool_id === p.id)).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label>Service Frequency</label>
                    <select value={routePoolForm.service_frequency} onChange={e => setRoutePoolForm(f => ({ ...f, service_frequency: e.target.value }))}>
                      {['daily','weekly','fortnightly','monthly','on_demand'].map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddPool(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add to Route'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'unavailability' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={() => setShowAddUnavail(true)}>
              <Plus size={15} /> Add Unavailability
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Staff Member</th><th>From</th><th>To</th><th>Reason</th><th>Approved By</th><th></th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : unavailability.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No unavailability recorded</td></tr>
                ) : unavailability.map((u: any) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '600' }}>
                      {u.member ? `${u.member.first_name} ${u.member.last_name}` : '—'}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.member?.role}</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.start_date}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.end_date}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{u.reason ?? '—'}</td>
                    <td>
                      {u.approver ? (
                        <span style={s.badge('#00b894')}>{u.approver.first_name} {u.approver.last_name}</span>
                      ) : (
                        <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={async () => {
                            await fetch('/api/admin/unavailability', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, action: 'approve' }) })
                            load()
                          }}>
                          Approve
                        </button>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--red)' }}
                        onClick={async () => {
                          await fetch('/api/admin/unavailability', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id }) })
                          load()
                        }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showAddUnavail && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddUnavail(false) }}>
              <div className="modal" style={{ maxWidth: '440px' }}>
                <div className="modal-title">Add Unavailability</div>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  setSaving(true)
                  const res = await fetch('/api/admin/unavailability', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(unavailForm),
                  })
                  if (res.ok) { setShowAddUnavail(false); setUnavailForm({ staff_id: '', start_date: '', end_date: '', reason: '' }); load() }
                  setSaving(false)
                }}>
                  <div style={s.formGroup}>
                    <label>Staff Member *</label>
                    <select required value={unavailForm.staff_id} onChange={e => setUnavailForm(f => ({ ...f, staff_id: e.target.value }))}>
                      <option value="">— Select Staff —</option>
                      {staff.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.role})</option>)}
                    </select>
                  </div>
                  <div style={s.formGrid}>
                    <div style={s.formGroup}>
                      <label>From *</label>
                      <input required type="date" value={unavailForm.start_date} onChange={e => setUnavailForm(f => ({ ...f, start_date: e.target.value }))} />
                    </div>
                    <div style={s.formGroup}>
                      <label>To *</label>
                      <input required type="date" value={unavailForm.end_date} onChange={e => setUnavailForm(f => ({ ...f, end_date: e.target.value }))} />
                    </div>
                  </div>
                  <div style={s.formGroup}>
                    <label>Reason</label>
                    <input value={unavailForm.reason} onChange={e => setUnavailForm(f => ({ ...f, reason: e.target.value }))} placeholder="Annual leave, sick leave, etc." />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddUnavail(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {showAddShift && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddShift(false) }}>
          <div className="modal">
            <div className="modal-title">{editingShift ? 'Edit Shift' : 'Add Shift'}</div>
            <form onSubmit={handleAddShift}>
              <div style={s.formGroup}>
                <label>Technician *</label>
                <select required value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}>
                  <option value="">— Select Staff —</option>
                  {staff.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.role})</option>)}
                </select>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Pool</label>
                  <select value={form.pool_id} onChange={e => setForm(f => ({ ...f, pool_id: e.target.value }))}>
                    <option value="">Office / Admin</option>
                    {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label>Shift Type *</label>
                  <select required value={form.shift_type} onChange={e => setForm(f => ({ ...f, shift_type: e.target.value }))}>
                    {['service_visit','repair','chemical_delivery','inspection','office','emergency'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Start *</label>
                  <input type="datetime-local" required value={form.scheduled_start}
                    onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>End *</label>
                  <input type="datetime-local" required value={form.scheduled_end}
                    onChange={e => setForm(f => ({ ...f, scheduled_end: e.target.value }))} />
                </div>
              </div>
              {editingShift && (
                <div style={s.formGroup}>
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {['scheduled','in_progress','completed','cancelled'].map(st => (
                      <option key={st} value={st}>{st.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={s.formGroup}>
                <label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddShift(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingShift ? 'Save Changes' : 'Add Shift'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── ASSETS TAB ────────────────────────────────────────────────────────────────
function AssetsTab() {
  const [assets, setAssets] = useState<any[]>([])
  const [pools, setPools] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAsset, setEditingAsset] = useState<any>(null)
  const [serviceLogAsset, setServiceLogAsset] = useState<any>(null)
  const [serviceLogs, setServiceLogs] = useState<any[]>([])
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [serviceForm, setServiceForm] = useState({
    service_type: 'inspection', description: '', parts_used: '', cost: '', next_service_date: '', service_date: new Date().toISOString().split('T')[0],
  })
  const [filterPool, setFilterPool] = useState('')
  const [form, setForm] = useState({
    pool_id: '', category_id: '', name: '', manufacturer: '', model: '',
    serial_number: '', install_date: '', warranty_expiry: '', expected_lifespan_years: '',
    replacement_cost: '', condition: 'good', location_description: '', next_service_date: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    const q = filterPool ? `?pool_id=${filterPool}` : ''
    Promise.all([
      fetch(`/api/admin/assets${q}`).then(r => r.json()),
      fetch('/api/admin/pools').then(r => r.json()),
    ]).then(([a, p]) => {
      setAssets(a.assets ?? [])
      setCategories(a.categories ?? [])
      setPools(p.pools ?? [])
      setLoading(false)
    })
  }, [filterPool])
  useEffect(() => { load() }, [load])

  const BLANK_ASSET_FORM = {
    pool_id: '', category_id: '', name: '', manufacturer: '', model: '',
    serial_number: '', install_date: '', warranty_expiry: '', expected_lifespan_years: '',
    replacement_cost: '', condition: 'good', location_description: '', next_service_date: '', notes: '',
  }

  function openAddAsset() {
    setEditingAsset(null)
    setForm(BLANK_ASSET_FORM)
    setShowModal(true)
  }

  function openEditAsset(a: any) {
    setEditingAsset(a)
    setForm({
      pool_id: a.pool_id ?? '', category_id: a.category_id ?? '', name: a.name ?? '',
      manufacturer: a.manufacturer ?? '', model: a.model ?? '', serial_number: a.serial_number ?? '',
      install_date: a.install_date ?? '', warranty_expiry: a.warranty_expiry ?? '',
      expected_lifespan_years: a.expected_lifespan_years ?? '', replacement_cost: a.replacement_cost ?? '',
      condition: a.condition ?? 'good', location_description: a.location_description ?? '',
      next_service_date: a.next_service_date ?? '', notes: a.notes ?? '',
    })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/assets', {
      method: editingAsset ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingAsset ? { id: editingAsset.id, ...form } : form),
    })
    if (res.ok) { setShowModal(false); load() }
    setSaving(false)
  }

  async function toggleAssetActive(a: any) {
    if (!confirm(`${a.is_active === false ? 'Reactivate' : 'Decommission'} "${a.name}"?`)) return
    await fetch('/api/admin/assets', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, is_active: a.is_active === false }),
    })
    load()
  }

  const conditionColour: Record<string, string> = {
    new: '#00b894', good: '#00b4d8', fair: '#fdcb6e', poor: '#e17055', failed: '#d63031',
  }

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Asset Register</div>
        <button className="btn btn-primary" onClick={openAddAsset}>
          <Plus size={16} /> Add Asset
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <select value={filterPool} onChange={e => setFilterPool(e.target.value)} style={{ width: '220px' }}>
          <option value="">All Pools</option>
          {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pool</th><th>Asset</th><th>Category</th><th>Manufacturer / Model</th>
              <th>Condition</th><th>Next Service</th><th>Replacement Cost</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : assets.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No assets registered</td></tr>
            ) : assets.map((a: any) => {
              const overdue = a.next_service_date && new Date(a.next_service_date) < new Date()
              return (
                <tr key={a.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{a.pools?.name ?? '—'}</td>
                  <td style={{ fontWeight: '600' }}>
                    <div>{a.name}</div>
                    {a.location_description && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.location_description}</div>}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{a.asset_categories?.name ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{[a.manufacturer, a.model].filter(Boolean).join(' ') || '—'}</td>
                  <td><span style={s.badge(conditionColour[a.condition] ?? '#64748b')}>{a.condition}</span></td>
                  <td style={{ color: overdue ? 'var(--red)' : 'var(--text-muted)', fontWeight: overdue ? '600' : 'normal' }}>
                    {a.next_service_date ?? '—'}
                    {overdue && <span style={{ fontSize: '10px', marginLeft: '6px' }}>OVERDUE</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {a.replacement_cost ? `$${Number(a.replacement_cost).toLocaleString()}` : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={async () => {
                          setServiceLogAsset(a)
                          setShowServiceForm(false)
                          const r = await fetch(`/api/admin/assets/${a.id}/service-log`)
                          const d = await r.json()
                          setServiceLogs(d.logs ?? [])
                        }}>
                        <Wrench size={12} /> Log
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => openEditAsset(a)}>
                        <Pencil size={12} />
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--red)' }}
                        onClick={() => toggleAssetActive(a)} title="Decommission">
                        <Power size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {serviceLogAsset && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) { setServiceLogAsset(null); setShowServiceForm(false) } }}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div className="modal-title" style={{ margin: '0 0 4px' }}>Service Log — {serviceLogAsset.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{serviceLogAsset.pools?.name} · {serviceLogAsset.asset_categories?.name}</div>
              </div>
              <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => setShowServiceForm(v => !v)}>
                {showServiceForm ? 'Cancel' : '+ Log Service'}
              </button>
            </div>

            {showServiceForm && (
              <form style={{ marginBottom: '24px', background: 'var(--surface-2)', borderRadius: '10px', padding: '16px' }}
                onSubmit={async (e) => {
                  e.preventDefault()
                  const res = await fetch(`/api/admin/assets/${serviceLogAsset.id}/service-log`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(serviceForm),
                  })
                  if (res.ok) {
                    const r = await fetch(`/api/admin/assets/${serviceLogAsset.id}/service-log`)
                    const d = await r.json()
                    setServiceLogs(d.logs ?? [])
                    setShowServiceForm(false)
                    setServiceForm({ service_type: 'inspection', description: '', parts_used: '', cost: '', next_service_date: '', service_date: new Date().toISOString().split('T')[0] })
                    load()
                  }
                }}>
                <div style={s.formGrid}>
                  <div style={s.formGroup}>
                    <label>Service Type *</label>
                    <select value={serviceForm.service_type} onChange={e => setServiceForm(f => ({ ...f, service_type: e.target.value }))}>
                      {['inspection','repair','replacement','calibration','cleaning','chemical_treatment'].map(t => (
                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label>Service Date</label>
                    <input type="date" value={serviceForm.service_date} onChange={e => setServiceForm(f => ({ ...f, service_date: e.target.value }))} />
                  </div>
                </div>
                <div style={s.formGroup}>
                  <label>Description *</label>
                  <textarea required rows={2} value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div style={s.formGrid}>
                  <div style={s.formGroup}>
                    <label>Parts Used</label>
                    <input value={serviceForm.parts_used} onChange={e => setServiceForm(f => ({ ...f, parts_used: e.target.value }))} />
                  </div>
                  <div style={s.formGroup}>
                    <label>Cost ($)</label>
                    <input type="number" step="0.01" value={serviceForm.cost} onChange={e => setServiceForm(f => ({ ...f, cost: e.target.value }))} />
                  </div>
                </div>
                <div style={s.formGroup}>
                  <label>Next Service Date</label>
                  <input type="date" value={serviceForm.next_service_date} onChange={e => setServiceForm(f => ({ ...f, next_service_date: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary">Save Service Log</button>
                </div>
              </form>
            )}

            {serviceLogs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px', fontSize: '13px' }}>No service history yet</div>
            ) : serviceLogs.map((log: any) => (
              <div key={log.id} style={{ padding: '12px 0', borderBottom: '1px solid #1a2d45' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={s.badge('#00b4d8')}>{log.service_type.replace('_', ' ')}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.service_date}</span>
                </div>
                <div style={{ fontSize: '13px', marginBottom: '4px' }}>{log.description}</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {log.tech && <span>By: {log.tech.first_name} {log.tech.last_name}</span>}
                  {log.parts_used && <span>Parts: {log.parts_used}</span>}
                  {log.cost && <span>Cost: ${Number(log.cost).toLocaleString()}</span>}
                  {log.next_service_date && <span style={{ color: 'var(--aqua)' }}>Next: {log.next_service_date}</span>}
                </div>
                <AttachmentPanel entityType="asset_service_log" entityId={log.id} />
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => { setServiceLogAsset(null); setShowServiceForm(false) }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-title">{editingAsset ? 'Edit Asset' : 'Add Asset'}</div>
            <form onSubmit={handleSave}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Pool *</label>
                  <select required value={form.pool_id} onChange={e => setForm(f => ({ ...f, pool_id: e.target.value }))}>
                    <option value="">— Select Pool —</option>
                    {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label>Category *</label>
                  <select required value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">— Select Category —</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Asset Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Circulation Pump" />
                </div>
                <div style={s.formGroup}>
                  <label>Condition</label>
                  <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                    {['new','good','fair','poor','failed'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Manufacturer</label>
                  <input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>Model</label>
                  <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Serial Number</label>
                  <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>Install Date</label>
                  <input type="date" value={form.install_date} onChange={e => setForm(f => ({ ...f, install_date: e.target.value }))} />
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Warranty Expiry</label>
                  <input type="date" value={form.warranty_expiry} onChange={e => setForm(f => ({ ...f, warranty_expiry: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>Next Service Date</label>
                  <input type="date" value={form.next_service_date} onChange={e => setForm(f => ({ ...f, next_service_date: e.target.value }))} />
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Replacement Cost ($)</label>
                  <input type="number" value={form.replacement_cost} onChange={e => setForm(f => ({ ...f, replacement_cost: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>Location in Facility</label>
                  <input value={form.location_description} onChange={e => setForm(f => ({ ...f, location_description: e.target.value }))} placeholder="e.g. Pump room, north wall" />
                </div>
              </div>
              <div style={s.formGroup}>
                <label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingAsset ? 'Save Changes' : 'Add Asset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── COMPLIANCE TAB ────────────────────────────────────────────────────────────
function ComplianceTab() {
  const [subTab, setSubTab] = useState<'events' | 'requirements'>('events')
  const [events, setEvents] = useState<any[]>([])
  const [requirements, setRequirements] = useState<any[]>([])
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [showReqModal, setShowReqModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reqForm, setReqForm] = useState({
    pool_id: '', requirement_type: '', description: '', frequency: 'monthly', authority: '', penalty_if_missed: '',
  })

  const load = useCallback(() => {
    const q = filterStatus ? `?status=${filterStatus}` : ''
    Promise.all([
      fetch(`/api/admin/compliance${q}`).then(r => r.json()),
      fetch('/api/admin/compliance-requirements').then(r => r.json()),
      fetch('/api/admin/pools').then(r => r.json()),
    ]).then(([c, r, p]) => {
      setEvents(c.events ?? [])
      setRequirements(r.requirements ?? [])
      setPools(p.pools ?? [])
      setLoading(false)
    })
  }, [filterStatus])
  useEffect(() => { load() }, [load])

  async function updateEventStatus(id: string, status: string) {
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, status } : ev))
    await fetch('/api/admin/compliance', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  const statusColour: Record<string, string> = {
    pending: '#00b4d8', completed: '#00b894', overdue: '#d63031',
    waived: '#64748b', failed: '#e17055',
  }

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Compliance Management</div>
        {subTab === 'requirements' && (
          <button className="btn btn-primary" onClick={() => setShowReqModal(true)}>
            <Plus size={15} /> Add Requirement
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--surface)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[{ id: 'events', label: 'Events' }, { id: 'requirements', label: 'Requirements' }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)} style={{
            padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600',
            background: subTab === t.id ? 'var(--aqua)' : 'transparent',
            color: subTab === t.id ? '#fff' : 'var(--text-muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {subTab === 'events' && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '200px' }}>
              <option value="">All Statuses</option>
              {['pending','completed','overdue','waived','failed'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Pool</th><th>Event Type</th><th>Due Date</th><th>Status</th><th>Completed</th><th>Authority</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : events.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No compliance events</td></tr>
                ) : events.map((ev: any) => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: '600' }}>{ev.pools?.name ?? '—'}</td>
                    <td>{ev.event_type}</td>
                    <td style={{ color: !!ev.due_date && new Date(ev.due_date) < new Date() && ev.status !== 'completed' ? 'var(--red)' : 'var(--text-muted)' }}>
                      {ev.due_date ?? '—'}
                    </td>
                    <td>
                      <select value={ev.status} onChange={e => updateEventStatus(ev.id, e.target.value)}
                        style={{ width: 'auto', padding: '4px 8px', fontSize: '12px', color: statusColour[ev.status], borderColor: (statusColour[ev.status] ?? '#64748b') + '60' }}>
                        {['pending','completed','overdue','waived','failed'].map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{ev.completed_date ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {ev.compliance_requirements?.authority ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subTab === 'requirements' && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Requirement</th><th>Applies To</th><th>Frequency</th><th>Authority</th><th>Active</th><th></th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : requirements.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No requirements defined — add templates to generate compliance events</td></tr>
                ) : requirements.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{r.requirement_type}</div>
                      {r.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.description}</div>}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.pools?.name ?? 'All pools'}</td>
                    <td><span style={s.badge('#00b4d8')}>{r.frequency}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{r.authority ?? '—'}</td>
                    <td>
                      <button onClick={async () => {
                        await fetch('/api/admin/compliance-requirements', {
                          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: r.id, is_active: !r.is_active }),
                        })
                        load()
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span style={s.badge(r.is_active ? '#00b894' : '#64748b')}>{r.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--red)' }}
                        onClick={async () => {
                          if (!confirm(`Delete requirement "${r.requirement_type}"?`)) return
                          await fetch('/api/admin/compliance-requirements', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id }) })
                          load()
                        }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showReqModal && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowReqModal(false) }}>
              <div className="modal" style={{ maxWidth: '560px' }}>
                <div className="modal-title">Add Compliance Requirement</div>
                <form onSubmit={async (ev) => {
                  ev.preventDefault()
                  setSaving(true)
                  const res = await fetch('/api/admin/compliance-requirements', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reqForm),
                  })
                  if (res.ok) { setShowReqModal(false); setReqForm({ pool_id: '', requirement_type: '', description: '', frequency: 'monthly', authority: '', penalty_if_missed: '' }); load() }
                  setSaving(false)
                }}>
                  <div style={s.formGrid}>
                    <div style={s.formGroup}>
                      <label>Requirement Type *</label>
                      <input required value={reqForm.requirement_type} onChange={e => setReqForm(f => ({ ...f, requirement_type: e.target.value }))} placeholder="e.g. Monthly Water Quality Report" />
                    </div>
                    <div style={s.formGroup}>
                      <label>Frequency *</label>
                      <select value={reqForm.frequency} onChange={e => setReqForm(f => ({ ...f, frequency: e.target.value }))}>
                        {['daily','weekly','monthly','quarterly','annually','on_demand'].map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={s.formGroup}>
                    <label>Applies To Pool (blank = all pools)</label>
                    <select value={reqForm.pool_id} onChange={e => setReqForm(f => ({ ...f, pool_id: e.target.value }))}>
                      <option value="">All Pools</option>
                      {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label>Description</label>
                    <textarea rows={2} value={reqForm.description} onChange={e => setReqForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div style={s.formGrid}>
                    <div style={s.formGroup}>
                      <label>Authority</label>
                      <input value={reqForm.authority} onChange={e => setReqForm(f => ({ ...f, authority: e.target.value }))} placeholder="e.g. Vic Health" />
                    </div>
                    <div style={s.formGroup}>
                      <label>Penalty if Missed</label>
                      <input value={reqForm.penalty_if_missed} onChange={e => setReqForm(f => ({ ...f, penalty_if_missed: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowReqModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Requirement'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

// ── RISK TAB ──────────────────────────────────────────────────────────────────
function RiskTab() {
  const [pools, setPools] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [allPools, setAllPools] = useState<any[]>([])
  const [form, setForm] = useState({
    pool_id: '', incident_type: 'water_quality', severity: 'medium',
    description: '', immediate_action: '', authority_notified: false,
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/admin/pools?include_risk=true').then(r => r.json()),
      fetch('/api/admin/reporting?section=incidents').then(r => r.json()),
    ]).then(([p, i]) => {
      setPools(p.pools ?? [])
      setAllPools(p.pools ?? [])
      setIncidents(i.incidents ?? [])
      setLoading(false)
    })
  }, [])
  useEffect(() => { load() }, [load])

  async function handleSaveIncident(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/reporting', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'incident', ...form }),
    })
    if (res.ok) { setShowModal(false); load() }
    setSaving(false)
  }

  async function resolveIncident(id: string) {
    setIncidents(prev => prev.filter(i => i.id !== id))
    await fetch('/api/admin/reporting', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'resolved' }),
    })
    load()
  }

  const severityColour: Record<string, string> = { low: '#00b894', medium: '#fdcb6e', high: '#e17055', critical: '#d63031' }

  // Sort pools by risk severity
  const riskOrder = { red: 0, orange: 1, yellow: 2, green: 3 }
  const sortedPools = [...pools].sort((a, b) =>
    (riskOrder[a.latest_risk as keyof typeof riskOrder] ?? 4) - (riskOrder[b.latest_risk as keyof typeof riskOrder] ?? 4)
  )

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Risk Management</div>
        <button className="btn btn-danger" style={{ background: '#d6303120', color: 'var(--red)', border: '1px solid #d6303140' }}
          onClick={() => setShowModal(true)}>
          <AlertTriangle size={16} /> Report Incident
        </button>
      </div>

      {/* Pool risk overview */}
      <div style={{ ...s.grid4, gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '24px' }}>
        {(['red','orange','yellow','green'] as const).map(level => {
          const count = pools.filter(p => p.latest_risk === level).length
          const colour = RISK_COLOURS[level]
          return (
            <div className="stat-tile" key={level} style={{ border: `1px solid ${colour}30` }}>
              <div className="stat-value" style={{ color: colour }}>{loading ? '—' : count}</div>
              <div className="stat-label">{RISK_LABELS[level]}</div>
            </div>
          )
        })}
      </div>

      <div style={s.grid2}>
        {/* Pool risk list */}
        <div className="card">
          <div style={s.sectionTitle}>Pool Risk Status</div>
          {loading ? <div style={{ color: 'var(--text-muted)' }}>Loading…</div> : sortedPools.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No pools — log a water test to generate risk status</div>
          ) : sortedPools.map((p: any) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '1px solid #1a2d45',
            }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.site_code}</div>
              </div>
              <span style={s.riskBadge(p.latest_risk ?? 'green')}>
                {RISK_LABELS[p.latest_risk as keyof typeof RISK_LABELS] ?? 'No data'}
              </span>
            </div>
          ))}
        </div>

        {/* Open incidents */}
        <div className="card">
          <div style={s.sectionTitle}>Open Incidents</div>
          {loading ? <div style={{ color: 'var(--text-muted)' }}>Loading…</div> : incidents.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No open incidents</div>
          ) : incidents.map((i: any) => (
            <div key={i.id} style={{
              padding: '12px 0', borderBottom: '1px solid #1a2d45',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600' }}>{i.pools?.name}</span>
                <span style={s.badge(severityColour[i.severity] ?? '#64748b')}>{i.severity}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {i.incident_type.replace('_', ' ')} — {new Date(i.occurred_at).toLocaleDateString('en-AU')}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '8px' }}>{i.description}</div>
              <AttachmentPanel entityType="incident" entityId={i.id} />
              <button className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: '11px', marginTop: '10px' }}
                onClick={() => resolveIncident(i.id)}>
                <Check size={12} /> Resolve
              </button>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-title">Report Incident</div>
            <form onSubmit={handleSaveIncident}>
              <div style={s.formGroup}>
                <label>Pool *</label>
                <select required value={form.pool_id} onChange={e => setForm(f => ({ ...f, pool_id: e.target.value }))}>
                  <option value="">— Select Pool —</option>
                  {allPools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Incident Type *</label>
                  <select required value={form.incident_type} onChange={e => setForm(f => ({ ...f, incident_type: e.target.value }))}>
                    {['injury','near_miss','equipment_failure','water_quality','security','vandalism','other'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label>Severity *</label>
                  <select required value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                    {['low','medium','high','critical'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.formGroup}>
                <label>Description *</label>
                <textarea required rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={s.formGroup}>
                <label>Immediate Action Taken</label>
                <textarea rows={2} value={form.immediate_action} onChange={e => setForm(f => ({ ...f, immediate_action: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={saving}>{saving ? 'Saving…' : 'Report Incident'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── CHEMICALS TAB ─────────────────────────────────────────────────────────────
function ChemicalsTab() {
  const [subTab, setSubTab] = useState<'inventory' | 'stock_take' | 'to_order' | 'usage'>('inventory')
  const [chemicals, setChemicals] = useState<any[]>([])
  const [usage, setUsage] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingChemical, setEditingChemical] = useState<any>(null)
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [editStock, setEditStock] = useState<{ id: string; stock: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'sanitiser', unit: 'drum', dose_unit: 'L', container_size: '', current_stock: '0',
    reorder_point: '0', supplier: '', safety_data_sheet_url: '',
  })
  const [usageForm, setUsageForm] = useState({
    pool_id: '', chemical_id: '', quantity: '', notes: '', applied_at: toLocalInput(),
  })
  const [stockTakeCounts, setStockTakeCounts] = useState<Record<string, string>>({})
  const [savingStockTake, setSavingStockTake] = useState(false)
  const [showAddOrder, setShowAddOrder] = useState(false)
  const [orderForm, setOrderForm] = useState({ chemical_id: '', quantity_needed: '', notes: '' })
  const [showReceived, setShowReceived] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/admin/chemicals').then(r => r.json()),
      fetch('/api/admin/chemicals?section=usage').then(r => r.json()),
      fetch(`/api/admin/chemical-orders${showReceived ? '?include_received=true' : ''}`).then(r => r.json()),
      fetch('/api/admin/pools').then(r => r.json()),
    ]).then(([c, u, o, p]) => {
      setChemicals(c.chemicals ?? [])
      setUsage(u.usage ?? [])
      setOrders(o.orders ?? [])
      setPools(p.pools ?? [])
      setStockTakeCounts(prev => {
        const next = { ...prev }
        for (const chem of c.chemicals ?? []) {
          if (!(chem.id in next)) next[chem.id] = String(chem.current_stock ?? '0')
        }
        return next
      })
      setLoading(false)
    })
  }, [showReceived])
  useEffect(() => { load() }, [load])

  function openAddChemical() {
    setEditingChemical(null)
    setForm({ name: '', type: 'sanitiser', unit: 'drum', dose_unit: 'L', container_size: '', current_stock: '0', reorder_point: '0', supplier: '', safety_data_sheet_url: '' })
    setShowModal(true)
  }

  function openEditChemical(c: any) {
    setEditingChemical(c)
    setForm({
      name: c.name ?? '', type: c.type ?? 'sanitiser', unit: c.unit ?? 'L',
      dose_unit: c.dose_unit ?? c.unit ?? 'L', container_size: c.container_size ? String(c.container_size) : '',
      current_stock: String(c.current_stock ?? '0'), reorder_point: String(c.reorder_point ?? '0'),
      supplier: c.supplier ?? '', safety_data_sheet_url: c.safety_data_sheet_url ?? '',
    })
    setShowModal(true)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/chemicals', {
      method: editingChemical ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingChemical ? { id: editingChemical.id, ...form } : form),
    })
    if (res.ok) { setShowModal(false); load() }
    setSaving(false)
  }

  async function handleLogUsage(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/chemicals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_usage', ...usageForm, applied_at: localInputToISO(usageForm.applied_at) }),
    })
    if (res.ok) { setShowUsageModal(false); load() }
    setSaving(false)
  }

  async function updateStock(id: string, stock: string) {
    await fetch('/api/admin/chemicals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_stock', id, current_stock: Number(stock) }),
    })
    setEditStock(null)
    load()
  }

  async function handleSaveStockTake() {
    setSavingStockTake(true)
    const counts = chemicals.map(c => ({ id: c.id, current_stock: Number(stockTakeCounts[c.id] ?? c.current_stock) }))
    await fetch('/api/admin/chemicals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stock_take', counts }),
    })
    setSavingStockTake(false)
    load()
  }

  async function handleAddOrder(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/chemical-orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderForm),
    })
    if (res.ok) { setShowAddOrder(false); setOrderForm({ chemical_id: '', quantity_needed: '', notes: '' }); load() }
    setSaving(false)
  }

  async function updateOrderStatus(id: string, status: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    await fetch('/api/admin/chemical-orders', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  async function deleteOrder(id: string) {
    setOrders(prev => prev.filter(o => o.id !== id))
    await fetch('/api/admin/chemical-orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  const typeColour: Record<string, string> = {
    sanitiser: '#00b4d8', ph_adjuster: '#fdcb6e', alkalinity: '#00b894',
    calcium: '#a29bfe', algaecide: '#6c5ce7', clarifier: '#81ecec',
    stabiliser: '#ffeaa7', flocculant: '#fab1a0', other: '#64748b',
  }

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Chemical Inventory</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setShowUsageModal(true)}>
            <FlaskConical size={15} /> Log Usage
          </button>
          <button className="btn btn-primary" onClick={openAddChemical}>
            <Plus size={16} /> Add Chemical
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--surface)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'inventory', label: 'Inventory' },
          { id: 'stock_take', label: 'Stock Take' },
          { id: 'to_order', label: `To Order${orders.filter(o => o.status === 'pending').length ? ` (${orders.filter(o => o.status === 'pending').length})` : ''}` },
          { id: 'usage', label: 'Usage Log' },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)} style={{
            padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600',
            background: subTab === t.id ? 'var(--aqua)' : 'transparent',
            color: subTab === t.id ? '#fff' : 'var(--text-muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {subTab === 'inventory' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Chemical</th><th>Type</th><th>Counted / Dosed</th><th>In Stock</th><th>Reorder At</th><th>Supplier</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : chemicals.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No chemicals added yet</td></tr>
              ) : chemicals.map((c: any) => {
                const lowStock = c.reorder_point > 0 && Number(c.current_stock) <= Number(c.reorder_point)
                return (
                  <tr key={c.id} style={{ background: lowStock ? '#e1705508' : undefined }}>
                    <td style={{ fontWeight: '600' }}>
                      {c.name}
                      {lowStock && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#e17055', fontWeight: '700' }}>LOW STOCK</span>}
                    </td>
                    <td><span style={s.badge(typeColour[c.type] ?? '#64748b')}>{c.type.replace('_', ' ')}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {c.unit}
                      {c.dose_unit && c.dose_unit !== c.unit && (
                        <span> · dosed in {c.dose_unit}{Number(c.container_size) > 0 ? ` (${Number(c.container_size)} ${c.dose_unit}/${c.unit})` : ''}</span>
                      )}
                    </td>
                    <td>
                      {editStock !== null && editStock.id === c.id ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input type="number" step="0.1" value={editStock.stock}
                            onChange={e => setEditStock(es => es ? { ...es, stock: e.target.value } : null)}
                            style={{ width: '80px', padding: '4px 8px', fontSize: '13px' }} />
                          <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => updateStock(c.id, editStock.stock)}>Save</button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => setEditStock(null)}>×</button>
                        </div>
                      ) : (
                        <span style={{ color: lowStock ? '#e17055' : 'var(--text)', fontWeight: lowStock ? '700' : 'normal' }}>
                          {Number(c.current_stock)} {c.unit}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.reorder_point > 0 ? `${c.reorder_point} ${c.unit}` : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.supplier ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => setEditStock({ id: c.id, stock: String(c.current_stock) })}>
                          Update Stock
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => openEditChemical(c)}>
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'stock_take' && (
        <>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
            Walk the shelf and enter the actual counted stock for each chemical, then save — anything at or below its reorder point is automatically added to the To Order list.
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Chemical</th><th>Type</th><th>System Stock</th><th>Counted Stock</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : chemicals.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No chemicals added yet</td></tr>
                ) : chemicals.map((c: any) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '600' }}>{c.name}</td>
                    <td><span style={s.badge(typeColour[c.type] ?? '#64748b')}>{c.type.replace('_', ' ')}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{Number(c.current_stock)} {c.unit}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="number" step="0.1" value={stockTakeCounts[c.id] ?? ''}
                          onChange={e => setStockTakeCounts(prev => ({ ...prev, [c.id]: e.target.value }))}
                          style={{ width: '100px', padding: '6px 10px', fontSize: '13px' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.unit}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn btn-primary" disabled={savingStockTake || chemicals.length === 0} onClick={handleSaveStockTake}>
              {savingStockTake ? 'Saving…' : 'Save Stock Take'}
            </button>
          </div>
        </>
      )}

      {subTab === 'to_order' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px' }}>
              <input type="checkbox" checked={showReceived} onChange={e => setShowReceived(e.target.checked)} />
              Show received
            </label>
            <button className="btn btn-secondary" onClick={() => setShowAddOrder(true)}>
              <Plus size={15} /> Add to Order List
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Chemical</th><th>Supplier</th><th>Quantity Needed</th><th>Notes</th><th>Added</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Nothing on the order list</td></tr>
                ) : orders.map((o: any) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: '600' }}>
                      {o.chemicals?.name ?? '—'}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {Number(o.chemicals?.current_stock ?? 0)} / {Number(o.chemicals?.reorder_point ?? 0)} {o.chemicals?.unit}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{o.chemicals?.supplier ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{o.quantity_needed ? `${Number(o.quantity_needed)} ${o.chemicals?.unit}` : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{o.notes ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{new Date(o.added_at).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })}</td>
                    <td>
                      <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}
                        style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}>
                        <option value="pending">Pending</option>
                        <option value="ordered">Ordered</option>
                        <option value="received">Received</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--red)' }}
                        onClick={() => deleteOrder(o.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showAddOrder && (
            <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddOrder(false) }}>
              <div className="modal" style={{ maxWidth: '440px' }}>
                <div className="modal-title">Add to Order List</div>
                <form onSubmit={handleAddOrder}>
                  <div style={s.formGroup}>
                    <label>Chemical *</label>
                    <select required value={orderForm.chemical_id} onChange={e => setOrderForm(f => ({ ...f, chemical_id: e.target.value }))}>
                      <option value="">— Select Chemical —</option>
                      {chemicals.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label>Quantity Needed</label>
                    <input type="number" step="0.1" value={orderForm.quantity_needed} onChange={e => setOrderForm(f => ({ ...f, quantity_needed: e.target.value }))} />
                  </div>
                  <div style={s.formGroup}>
                    <label>Notes</label>
                    <textarea rows={2} value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddOrder(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add to List'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {subTab === 'usage' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Pool</th><th>Chemical</th><th>Quantity</th><th>Applied By</th><th>Date</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : usage.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No usage logged yet</td></tr>
              ) : usage.map((u: any) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: '600' }}>{u.pools?.name ?? '—'}</td>
                  <td>{u.chemicals?.name ?? '—'}</td>
                  <td>{u.quantity} {u.chemicals?.dose_unit ?? u.chemicals?.unit}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {u.applier ? `${u.applier.first_name} ${u.applier.last_name}` : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {new Date(u.applied_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{u.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div className="modal-title">{editingChemical ? 'Edit Chemical' : 'Add Chemical'}</div>
            <form onSubmit={handleAdd}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Chemical Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {['sanitiser','ph_adjuster','alkalinity','calcium','algaecide','clarifier','stabiliser','flocculant','other'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ ...s.formGrid, gridTemplateColumns: 'repeat(3,1fr)' }}>
                <div style={s.formGroup}>
                  <label>Stock Counted In</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {['drum','bucket','bag','box','each','L','kg','tablet','g','mL'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label>Dosed In</label>
                  <select value={form.dose_unit} onChange={e => setForm(f => ({ ...f, dose_unit: e.target.value }))}>
                    {['L','kg','mL','g','tablet','each'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label>{form.dose_unit} per {form.unit}</label>
                  <input type="number" step="0.01" min="0" placeholder={form.unit === form.dose_unit ? '1' : 'e.g. 15'}
                    value={form.container_size} onChange={e => setForm(f => ({ ...f, container_size: e.target.value }))} />
                </div>
              </div>
              <div style={{ ...s.formGrid, gridTemplateColumns: 'repeat(2,1fr)' }}>
                <div style={s.formGroup}>
                  <label>Current Stock</label>
                  <input type="number" step="0.1" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>Reorder Point</label>
                  <input type="number" step="0.1" value={form.reorder_point} onChange={e => setForm(f => ({ ...f, reorder_point: e.target.value }))} />
                </div>
              </div>
              <div style={s.formGroup}>
                <label>Supplier</label>
                <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingChemical ? 'Save Changes' : 'Add Chemical'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUsageModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowUsageModal(false) }}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-title">Log Chemical Usage</div>
            <form onSubmit={handleLogUsage}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label>Pool *</label>
                  <select required value={usageForm.pool_id} onChange={e => setUsageForm(f => ({ ...f, pool_id: e.target.value }))}>
                    <option value="">— Select Pool —</option>
                    {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label>Chemical *</label>
                  <select required value={usageForm.chemical_id} onChange={e => setUsageForm(f => ({ ...f, chemical_id: e.target.value }))}>
                    <option value="">— Select Chemical —</option>
                    {chemicals.map(c => <option key={c.id} value={c.id}>{c.name} ({c.current_stock} {c.unit} available)</option>)}
                  </select>
                </div>
              </div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  {(() => {
                    const sel = chemicals.find((c: any) => c.id === usageForm.chemical_id)
                    const doseUnit = sel?.dose_unit ?? sel?.unit
                    return <label>Quantity Applied{doseUnit ? ` (${doseUnit})` : ''} *</label>
                  })()}
                  <input required type="number" step="0.01" min="0" value={usageForm.quantity} onChange={e => setUsageForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div style={s.formGroup}>
                  <label>Date / Time</label>
                  <input type="datetime-local" value={usageForm.applied_at} onChange={e => setUsageForm(f => ({ ...f, applied_at: e.target.value }))} />
                </div>
              </div>
              <div style={s.formGroup}>
                <label>Notes</label>
                <textarea rows={2} value={usageForm.notes} onChange={e => setUsageForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUsageModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Logging…' : 'Log Usage'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── CLOSURES TAB ──────────────────────────────────────────────────────────────
function ClosuresTab() {
  const [closures, setClosures] = useState<any[]>([])
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    pool_id: '', closure_reason: '', authority_notified: false, notes: '',
  })

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/admin/closures').then(r => r.json()),
      fetch('/api/admin/pools').then(r => r.json()),
    ]).then(([c, p]) => {
      setClosures(c.closures ?? [])
      setPools(p.pools ?? [])
      setLoading(false)
    })
  }, [])
  useEffect(() => { load() }, [load])

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/closures', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setShowModal(false); load() }
    setSaving(false)
  }

  async function handleReopen(id: string) {
    await fetch('/api/admin/closures', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reopen' }),
    })
    load()
  }

  const openClosures = closures.filter(c => !c.reopened_at)
  const closedPools = new Set(openClosures.map((c: any) => c.pool_id))

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Pool Closures</div>
        <button className="btn btn-danger" style={{ background: '#d6303120', color: 'var(--red)', border: '1px solid #d6303140' }}
          onClick={() => setShowModal(true)}>
          <XCircle size={15} /> Close a Pool
        </button>
      </div>

      {openClosures.length > 0 && (
        <div style={{ background: '#d6303110', border: '1px solid #d6303140', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
          <div style={{ fontWeight: '700', color: 'var(--red)', marginBottom: '6px' }}>
            {openClosures.length} pool{openClosures.length !== 1 ? 's' : ''} currently closed
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {openClosures.map((c: any) => (
              <span key={c.id} style={s.badge('#d63031')}>{c.pools?.name ?? c.pool_id}</span>
            ))}
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Pool</th><th>Closed</th><th>Reason</th><th>Closed By</th><th>Authority Notified</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : closures.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No pool closures recorded</td></tr>
            ) : closures.map((c: any) => (
              <tr key={c.id}>
                <td style={{ fontWeight: '600' }}>{c.pools?.name ?? '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {new Date(c.closed_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
                </td>
                <td style={{ maxWidth: '200px' }}>{c.closure_reason}</td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {c.closer ? `${c.closer.first_name} ${c.closer.last_name}` : '—'}
                </td>
                <td>
                  <span style={s.badge(c.authority_notified ? '#00b894' : '#64748b')}>
                    {c.authority_notified ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  {c.reopened_at ? (
                    <span style={s.badge('#00b894')}>Reopened</span>
                  ) : (
                    <span style={s.badge('#d63031')}>CLOSED</span>
                  )}
                </td>
                <td>
                  {!c.reopened_at && (
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => handleReopen(c.id)}>
                      Reopen
                    </button>
                  )}
                  {c.reopened_at && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(c.reopened_at).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-title" style={{ color: 'var(--red)' }}>Close a Pool</div>
            <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              This will log a formal pool closure. The pool should be physically closed and signage placed before proceeding.
            </div>
            <form onSubmit={handleClose}>
              <div style={s.formGroup}>
                <label>Pool *</label>
                <select required value={form.pool_id} onChange={e => setForm(f => ({ ...f, pool_id: e.target.value }))}>
                  <option value="">— Select Pool —</option>
                  {pools.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{closedPools.has(p.id) ? ' (already closed)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div style={s.formGroup}>
                <label>Closure Reason *</label>
                <select required value={form.closure_reason} onChange={e => setForm(f => ({ ...f, closure_reason: e.target.value }))}>
                  <option value="">— Select Reason —</option>
                  <option value="Water quality — critical chlorine level">Water quality — critical chlorine level</option>
                  <option value="Water quality — pH out of range">Water quality — pH out of range</option>
                  <option value="Water quality — visible contamination">Water quality — visible contamination</option>
                  <option value="Equipment failure">Equipment failure</option>
                  <option value="Injury in pool">Injury in pool</option>
                  <option value="Scheduled maintenance">Scheduled maintenance</option>
                  <option value="Authority order">Authority order</option>
                  <option value="Weather / safety">Weather / safety</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={s.formGroup}>
                <label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ ...s.formGroup, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="auth-notified" checked={form.authority_notified}
                  onChange={e => setForm(f => ({ ...f, authority_notified: e.target.checked }))} />
                <label htmlFor="auth-notified" style={{ cursor: 'pointer', margin: 0 }}>Authority has been notified</label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" style={{ background: '#d6303120', color: 'var(--red)', border: '1px solid #d6303140' }}
                  disabled={saving}>{saving ? 'Closing…' : 'Close Pool'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── CHECKLISTS TAB ────────────────────────────────────────────────────────────
function ChecklistsTab() {
  const [checklists, setChecklists] = useState<any[]>([])
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filterPool, setFilterPool] = useState('')
  const [filterFlags, setFilterFlags] = useState(false)

  const load = useCallback(() => {
    const q = new URLSearchParams()
    if (filterPool)  q.set('pool_id', filterPool)
    if (filterFlags) q.set('flags_only', 'true')
    Promise.all([
      fetch(`/api/admin/checklists?${q}`).then(r => r.json()),
      fetch('/api/admin/pools').then(r => r.json()),
    ]).then(([c, p]) => {
      setChecklists(c.checklists ?? [])
      setPools(p.pools ?? [])
      setLoading(false)
    })
  }, [filterPool, filterFlags])
  useEffect(() => { load() }, [load])

  async function loadDetail(id: string) {
    setDetailLoading(true)
    const res = await fetch(`/api/admin/checklists?id=${id}`)
    const data = await res.json()
    setSelected(data.checklist)
    setDetailLoading(false)
  }

  const checkIcon = (val: boolean | null | undefined) =>
    val === true  ? <span style={{ color: '#00b894', fontWeight: '700' }}>✓</span>
    : val === false ? <span style={{ color: '#d63031', fontWeight: '700' }}>✗</span>
    : <span style={{ color: '#64748b' }}>—</span>

  const passIcon = (val: string | null | undefined, pass: string, fail: string) =>
    val === pass ? <span style={{ color: '#00b894', fontWeight: '700' }}>✓ {val}</span>
    : val === fail ? <span style={{ color: '#d63031', fontWeight: '700' }}>✗ {val?.toUpperCase()}</span>
    : <span style={{ color: '#64748b' }}>{val ?? '—'}</span>

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Shift Checklists</div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={filterPool} onChange={e => setFilterPool(e.target.value)} style={{ width: '220px' }}>
          <option value="">All Pools</option>
          {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px' }}>
          <input type="checkbox" checked={filterFlags} onChange={e => setFilterFlags(e.target.checked)} />
          Flagged only
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Pool</th><th>Lifeguard</th><th>Pre-Shift</th>
              <th>AED</th><th>Safety Equip</th><th>Sessions</th><th>Flags</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : checklists.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No checklists submitted yet</td></tr>
            ) : checklists.map((c: any) => (
              <tr key={c.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {c.checklist_date}
                  {c.pre_shift_time && <div style={{ color: 'var(--text-dim)' }}>{c.pre_shift_time}</div>}
                </td>
                <td style={{ fontWeight: '600' }}>{c.pools?.name ?? '—'}</td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {c.staff ? `${c.staff.first_name} ${c.staff.last_name}` : '—'}
                </td>
                <td style={{ fontSize: '13px' }}>
                  {c.water_clarity && (
                    <span style={{
                      fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px',
                      background: c.water_clarity === 'great' ? '#00b89420' : c.water_clarity === 'concern' ? '#d6303120' : '#fdcb6e20',
                      color: c.water_clarity === 'great' ? '#00b894' : c.water_clarity === 'concern' ? '#d63031' : '#fdcb6e',
                      border: `1px solid ${c.water_clarity === 'great' ? '#00b89440' : c.water_clarity === 'concern' ? '#d6303140' : '#fdcb6e40'}`,
                    }}>
                      {c.water_clarity}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: '13px' }}>
                  {c.aed_self_test === 'pass' ? <span style={{ color: '#00b894', fontWeight: '700', fontSize: '11px' }}>PASS</span>
                   : c.aed_self_test === 'fail' ? <span style={{ color: '#d63031', fontWeight: '700', fontSize: '11px' }}>FAIL ⚠</span>
                   : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                </td>
                <td style={{ fontSize: '13px' }}>
                  {c.safety_equipment_check === 'ok' ? <span style={{ color: '#00b894', fontWeight: '700', fontSize: '11px' }}>OK</span>
                   : c.safety_equipment_check === 'fail' ? <span style={{ color: '#d63031', fontWeight: '700', fontSize: '11px' }}>FAIL ⚠</span>
                   : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  {c.shift_sessions?.length ?? 0}
                </td>
                <td>
                  {c.has_flags ? (
                    <span style={{ ...s.badge('#d63031'), fontSize: '11px' }}>
                      ⚠ {c.flag_summary?.length ?? 0} flag{(c.flag_summary?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span style={{ ...s.badge('#00b894'), fontSize: '11px' }}>Clear</span>
                  )}
                </td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => loadDetail(c.id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="modal" style={{ maxWidth: '760px', maxHeight: '88vh' }}>
            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading…</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div className="modal-title" style={{ margin: '0 0 4px' }}>Shift Checklist — {selected.pools?.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {selected.checklist_date} · {selected.staff ? `${selected.staff.first_name} ${selected.staff.last_name}` : 'Unknown'}
                    </div>
                  </div>
                  {selected.has_flags && (
                    <div style={{ background: '#d6303120', border: '1px solid #d6303140', borderRadius: '8px', padding: '10px 14px', maxWidth: '220px' }}>
                      {selected.flag_summary?.map((f: string) => (
                        <div key={f} style={{ fontSize: '11px', color: '#d63031', fontWeight: '600' }}>⚠ {f}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  {/* Pre-shift */}
                  <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--aqua)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>Pre-Shift</div>
                    {[
                      ['Time', selected.pre_shift_time],
                      ['Lifeguards on duty', selected.lifeguards_on_duty],
                    ].map(([l, v]) => (
                      <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                        <span>{v ?? '—'}</span>
                      </div>
                    ))}
                    {[
                      ['Keys retrieved', selected.keys_retrieved],
                      ['Patrol log signed', selected.patrol_log_signed],
                      ['Bumbag retrieved', selected.bumbag_retrieved],
                      ['Pool door unlocked', selected.pool_door_unlocked],
                      ['Lights on', selected.lights_on],
                      ['Changerooms opened', selected.changerooms_opened],
                    ].map(([l, v]) => (
                      <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                        {checkIcon(v as boolean)}
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Deck perimeter walk</span>
                      <span style={{ color: selected.deck_perimeter_walk === 'all_clear' ? '#00b894' : selected.deck_perimeter_walk === 'issue' ? '#d63031' : 'var(--text-muted)' }}>
                        {selected.deck_perimeter_walk?.replace('_', ' ') ?? '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Water clarity</span>
                      <span style={{ color: selected.water_clarity === 'great' ? '#00b894' : selected.water_clarity === 'concern' ? '#d63031' : 'var(--text)' }}>
                        {selected.water_clarity ?? '—'}
                      </span>
                    </div>
                  </div>

                  {/* Equipment */}
                  <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#fdcb6e', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>Equipment</div>
                    {[
                      ['Safety equipment', passIcon(selected.safety_equipment_check, 'ok', 'fail')],
                      ['Throw bags', selected.throw_bags_count ?? '—'],
                      ['Rescue tubes', selected.rescue_tubes_count ?? '—'],
                      ['Spine board', checkIcon(selected.spine_board_present)],
                      ['First aid kit', checkIcon(selected.first_aid_kit_ok)],
                      ['Oxygen equipment', passIcon(selected.oxygen_equipment_check, 'ok', 'fail')],
                      ['AED daily check', passIcon(selected.aed_check, 'ok', 'fail')],
                      ['AED self test', passIcon(selected.aed_self_test, 'pass', 'fail')],
                    ].map(([l, v]) => (
                      <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{l as string}</span>
                        <span>{v as React.ReactNode}</span>
                      </div>
                    ))}
                    {selected.end_of_shift_time && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>End of shift</span>
                        <span style={{ fontWeight: '600' }}>{selected.end_of_shift_time}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sessions */}
                {selected.shift_sessions?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>
                      Sessions ({selected.shift_sessions.length})
                    </div>
                    {selected.shift_sessions.map((sess: any) => (
                      <div key={sess.id} style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '16px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--aqua)' }}>
                            Session {sess.session_number}{sess.pool_users ? ` — ${sess.pool_users}` : ''}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {sess.start_time}{sess.finish_time ? ` – ${sess.finish_time}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                          {[
                            [`LGs on shift`, sess.lifeguards_on_shift ?? '—'],
                            [`Rules observed`, sess.rules_observed ? '✓ Yes' : '✗ No'],
                            [`Reporting required`, sess.reporting_required ? '⚠ Yes' : 'No'],
                            [`Lane ropes replaced`, sess.lane_ropes_replaced ? '✓' : sess.lane_ropes_replaced === false ? '✗' : '—'],
                            [`Deck walk`, sess.deck_perimeter_walk ? '✓' : sess.deck_perimeter_walk === false ? '✗' : '—'],
                            [`Changerooms closed`, sess.changerooms_closed ? '✓' : sess.changerooms_closed === false ? '✗' : '—'],
                            [`Lights off`, sess.lights_off ? '✓' : sess.lights_off === false ? '✗' : '—'],
                            [`Keys replaced`, sess.keys_replaced ? '✓' : sess.keys_replaced === false ? '✗' : '—'],
                          ].map(([l, v]) => (
                            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                              <span>{l}</span><span style={{ color: 'var(--text)' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        {sess.lifeguard_names?.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Lifeguards: {sess.lifeguard_names.join(', ')}
                          </div>
                        )}
                        {sess.external_staff_names?.length > 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            External staff: {sess.external_staff_names.join(', ')}
                          </div>
                        )}
                        {sess.incident_description && (
                          <div style={{ marginTop: '10px', background: '#e1705520', border: '1px solid #e1705540', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#e17055' }}>
                            ⚠ {sess.incident_description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selected.notes && (
                  <div style={{ marginTop: '12px', background: 'var(--surface-2)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {selected.notes}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── REMOTE SITES TAB ──────────────────────────────────────────────────────────
function RemoteSitesTab() {
  const [sensors, setSensors] = useState<any[]>([])
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    pool_id: '', device_type: '', manufacturer: '', serial_number: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [key, setKey] = useState<string | null>(null)
  const [editingSensor, setEditingSensor] = useState<any>(null)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/iot/sensors').then(r => r.json()),
      fetch('/api/admin/pools').then(r => r.json()),
    ]).then(([s, p]) => {
      setSensors(s.sensors ?? [])
      setPools(p.pools ?? [])
      setLoading(false)
    })
  }, [])
  useEffect(() => { load() }, [load])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/iot/sensors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) { setKey(data.sensor_key); load() }
    setSaving(false)
  }

  function openEditSensor(sensor: any) {
    setEditingSensor(sensor)
    setForm({
      pool_id: sensor.pool_id ?? '', device_type: sensor.device_type ?? '',
      manufacturer: sensor.manufacturer ?? '', serial_number: sensor.serial_number ?? '', notes: sensor.notes ?? '',
    })
    setShowModal(true)
  }

  async function handleSaveSensor(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/iot/sensors', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingSensor.id, ...form }),
    })
    setShowModal(false)
    setEditingSensor(null)
    load()
    setSaving(false)
  }

  async function toggleSensorActive(sensor: any) {
    await fetch('/api/iot/sensors', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sensor.id, is_active: !sensor.is_active }),
    })
    load()
  }

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Remote Sites & IoT Sensors</div>
        <button className="btn btn-primary" onClick={() => { setEditingSensor(null); setForm({ pool_id: '', device_type: '', manufacturer: '', serial_number: '', notes: '' }); setShowModal(true) }}>
          <Plus size={16} /> Register Sensor
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px', border: '1px solid #00b4d830' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Wifi size={20} color="var(--aqua)" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: '700', marginBottom: '6px' }}>IoT Sensor Ingest Endpoint</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Configure your IoT sensor / smart controller to POST readings to this webhook. Each sensor authenticates with its unique <code style={{ color: 'var(--aqua)' }}>sensor_key</code>.
            </div>
            <code style={{ background: '#121f35', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--aqua)', display: 'block' }}>
              POST {process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/iot/ingest
            </code>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Payload: <code style={{ color: '#64748b' }}>{`{ "sensor_key": "...", "free_chlorine": 2.1, "ph": 7.4, "temperature_c": 28, ... }`}</code>
            </div>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Pool</th><th>Device</th><th>Manufacturer</th><th>Serial</th><th>Last Seen</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : sensors.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No sensors registered</td></tr>
            ) : sensors.map((sensor: any) => {
              const lastSeen = sensor.last_seen_at ? new Date(sensor.last_seen_at) : null
              const isStale = lastSeen && (Date.now() - lastSeen.getTime()) > 1000 * 60 * 60 * 2
              return (
                <tr key={sensor.id}>
                  <td style={{ fontWeight: '600' }}>{sensor.pools?.name ?? '—'}</td>
                  <td>{sensor.device_type ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{sensor.manufacturer ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{sensor.serial_number ?? '—'}</td>
                  <td style={{ color: isStale ? 'var(--orange)' : 'var(--text-muted)', fontSize: '12px' }}>
                    {lastSeen ? lastSeen.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }) : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => toggleSensorActive(sensor)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span style={s.badge(sensor.is_active ? '#00b894' : '#64748b')}>
                          {sensor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => openEditSensor(sensor)}>
                        <Pencil size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setKey(null); setEditingSensor(null) } }}>
          <div className="modal">
            {key ? (
              <>
                <div className="modal-title" style={{ color: 'var(--green)' }}>Sensor Registered</div>
                <div style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Copy this sensor key and configure it on your IoT device. <strong style={{ color: 'var(--red)' }}>It will not be shown again.</strong>
                </div>
                <div style={{ background: '#121f35', borderRadius: '8px', padding: '16px', border: '1px solid #00b4d840', marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>SENSOR KEY</div>
                  <code style={{ color: 'var(--aqua)', wordBreak: 'break-all', fontSize: '14px' }}>{key}</code>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowModal(false); setKey(null) }}>Done</button>
              </>
            ) : (
              <>
                <div className="modal-title">{editingSensor ? 'Edit Sensor' : 'Register IoT Sensor'}</div>
                <form onSubmit={editingSensor ? handleSaveSensor : handleRegister}>
                  <div style={s.formGroup}>
                    <label>Pool *</label>
                    <select required value={form.pool_id} onChange={e => setForm(f => ({ ...f, pool_id: e.target.value }))}>
                      <option value="">— Select Pool —</option>
                      {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div style={s.formGrid}>
                    <div style={s.formGroup}>
                      <label>Device Type</label>
                      <input value={form.device_type} onChange={e => setForm(f => ({ ...f, device_type: e.target.value }))} placeholder="e.g. WaterGuru Sense" />
                    </div>
                    <div style={s.formGroup}>
                      <label>Manufacturer</label>
                      <input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
                    </div>
                  </div>
                  <div style={s.formGroup}>
                    <label>Serial Number</label>
                    <input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
                  </div>
                  <div style={s.formGroup}>
                    <label>Notes</label>
                    <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingSensor(null) }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingSensor ? 'Save Changes' : 'Register'}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── ERROR LOG TAB ──────────────────────────────────────────────────────────────
function FeedbackTab() {
  const [feedback, setFeedback] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<any>(null)

  const load = useCallback(() => {
    fetch('/api/feedback').then(r => r.json()).then(d => {
      setFeedback(d.feedback ?? [])
      setLoading(false)
    })
  }, [])
  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string) {
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f))
    if (selected?.id === id) setSelected((s: any) => s && { ...s, status })
    await fetch(`/api/feedback/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  const typeColour: Record<string, string> = { bug: '#d63031', feature: '#00b4d8', improvement: '#fdcb6e' }
  const priorityColour: Record<string, string> = { low: '#64748b', medium: '#fdcb6e', high: '#d63031' }
  const statusColour: Record<string, string> = { pending: '#fdcb6e', in_progress: '#00b4d8', done: '#00b894' }

  const visible = filterStatus ? feedback.filter(f => f.status === filterStatus) : feedback
  const pendingCount = feedback.filter(f => f.status === 'pending').length

  return (
    <>
      <div style={s.header}>
        <div style={s.pageTitle}>Error Log</div>
      </div>

      <div style={{ ...s.grid3, gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: '#fdcb6e' }}>{loading ? '—' : pendingCount}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: '#00b4d8' }}>{loading ? '—' : feedback.filter(f => f.status === 'in_progress').length}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: '#00b894' }}>{loading ? '—' : feedback.filter(f => f.status === 'done').length}</div>
          <div className="stat-label">Done</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '200px' }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th><th>Title</th><th>Priority</th><th>Reported By</th><th>Page</th><th>Date</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No reports — nice and quiet.</td></tr>
            ) : visible.map((f: any) => (
              <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(f)}>
                <td><span style={s.badge(typeColour[f.type] ?? '#64748b')}>{f.type}</span></td>
                <td style={{ fontWeight: '600', maxWidth: '280px' }}>{f.title}</td>
                <td><span style={s.badge(priorityColour[f.priority] ?? '#64748b')}>{f.priority}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{f.submitted_by ?? '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{f.page_url ?? '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {new Date(f.created_at).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <select value={f.status} onChange={e => updateStatus(f.id, e.target.value)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '12px', color: statusColour[f.status], borderColor: statusColour[f.status] + '60' }}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <span style={s.badge(typeColour[selected.type] ?? '#64748b')}>{selected.type}</span>
                  <span style={s.badge(priorityColour[selected.priority] ?? '#64748b')}>{selected.priority}</span>
                </div>
                <div className="modal-title" style={{ margin: 0 }}>{selected.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>
                  {selected.submitted_by ?? 'Unknown'} ·{' '}
                  {new Date(selected.created_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' })}
                  {selected.page_url && <> · {selected.page_url}</>}
                </div>
              </div>
              <select value={selected.status} onChange={e => updateStatus(selected.id, e.target.value)}
                style={{ width: 'auto', padding: '6px 10px', fontSize: '12px', color: statusColour[selected.status], borderColor: statusColour[selected.status] + '60' }}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            {selected.description && (
              <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: '13px', color: 'var(--text)' }}>
                {selected.description}
              </div>
            )}

            {selected.screenshot_url && (
              <a href={selected.screenshot_url} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: '16px' }}>
                <img src={selected.screenshot_url} alt="Screenshot" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
              </a>
            )}

            {(selected.ai_diagnosis || selected.ai_workaround || selected.ai_fix_hint) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selected.ai_diagnosis && (
                  <div style={{ background: '#00b4d818', border: '1px solid #00b4d840', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ color: '#00b4d8', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>AI: Likely Root Cause</div>
                    <div style={{ color: 'var(--text)', fontSize: '13px' }}>{selected.ai_diagnosis}</div>
                  </div>
                )}
                {selected.ai_workaround && (
                  <div style={{ background: '#00b89418', border: '1px solid #00b89440', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ color: '#00b894', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>AI: Workaround</div>
                    <div style={{ color: 'var(--text)', fontSize: '13px' }}>{selected.ai_workaround}</div>
                  </div>
                )}
                {selected.ai_fix_hint && (
                  <div style={{ background: '#fdcb6e18', border: '1px solid #fdcb6e40', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ color: '#fdcb6e', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>AI: Suggested Fix Approach</div>
                    <div style={{ color: 'var(--text)', fontSize: '13px' }}>{selected.ai_fix_hint}</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── ROOT ADMIN PAGE ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
  }, [])

  const loadNotifs = useCallback(() => {
    fetch('/api/admin/notifications').then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setNotifications(d.notifications ?? []); setUnreadCount(d.unread_count ?? 0) }
    })
  }, [])
  useEffect(() => { loadNotifs() }, [loadNotifs])

  async function markAllRead() {
    await fetch('/api/admin/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
    loadNotifs()
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const TAB_TITLES: Record<Tab, string> = {
    overview: 'Overview',
    pools: 'Pool Register',
    'water-testing': 'Water Testing',
    microbiology: 'Microbiology Testing',
    'chemistry-calc': 'Chemistry Calculator',
    staff: 'Staff & Scheduling',
    checklists: 'Shift Checklists',
    assets: 'Asset Register',
    compliance: 'Compliance',
    chemicals: 'Chemical Inventory',
    closures: 'Pool Closures',
    risk: 'Risk Management',
    'risk-register': 'Corrective Actions & Risk Register',
    'remote-sites': 'Remote Sites & IoT',
    wqrmp: 'WQRMP Reports',
    errors: 'Error Log',
  }

  return (
    <div style={s.page} className="admin-shell">
      {/* Sidebar */}
      <div style={s.sidebar} className="admin-sidebar">
        <div style={s.logo} className="admin-logo">
          <div style={s.logoIcon}>💧</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#00b4d8', letterSpacing: '0.5px' }}>AquaPro</div>
            <div style={{ fontSize: '10px', color: '#334155' }}>Pool Management</div>
          </div>
        </div>

        <nav style={s.nav} className="admin-nav">
          {NAV.map(item => {
            const Icon = item.icon
            return (
              <button key={item.id} style={s.navBtn(tab === item.id)} onClick={() => setTab(item.id)}>
                <Icon size={15} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2d45' }} className="admin-sidebar-footer">
          {user && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', color: '#64748b',
            fontSize: '12px', cursor: 'pointer', padding: '6px 0',
          }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <main style={s.main} className="admin-main">
        <div style={{ ...s.header, marginBottom: '28px' }} className="admin-header">
          <h1 style={s.pageTitle}>{TAB_TITLES[tab]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' })}
            </div>
            <ReportIssueButton iconOnly={false} />
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifs(v => !v)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                color: unreadCount > 0 ? 'var(--aqua)' : 'var(--text-muted)', position: 'relative',
              }}>
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '0', right: '0',
                    background: '#d63031', color: '#fff', borderRadius: '99px',
                    fontSize: '10px', fontWeight: '700', minWidth: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                  }}>{unreadCount}</span>
                )}
              </button>
              {showNotifs && (
                <div style={{
                  position: 'absolute', right: 0, top: '38px', width: '340px', zIndex: 1000,
                  background: '#0d1829', border: '1px solid #1a2d45', borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1a2d45' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--aqua)' }}>Mark all read</button>
                    )}
                  </div>
                  <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No notifications</div>
                    ) : notifications.map((n: any) => (
                      <div key={n.id} style={{
                        padding: '12px 16px', borderBottom: '1px solid #1a2d4530',
                        background: n.is_read ? 'transparent' : '#00b4d808',
                        cursor: 'pointer',
                      }} onClick={async () => {
                        await fetch('/api/admin/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) })
                        loadNotifs()
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: n.is_read ? '400' : '600', color: 'var(--text)' }}>{n.title}</span>
                          {!n.is_read && <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: 'var(--aqua)', flexShrink: 0, marginTop: '5px' }} />}
                        </div>
                        {n.body && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{n.body}</div>}
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                          {n.pools?.name && `${n.pools.name} · `}
                          {new Date(n.created_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {tab === 'overview'      && <OverviewTab />}
        {tab === 'pools'         && <PoolsTab />}
        {tab === 'water-testing' && <WaterTestingTab />}
        {tab === 'microbiology'  && <MicrobiologyTab />}
        {tab === 'chemistry-calc' && <ChemistryCalculatorTab />}
        {tab === 'staff'         && <StaffTab />}
        {tab === 'checklists'    && <ChecklistsTab />}
        {tab === 'assets'        && <AssetsTab />}
        {tab === 'compliance'    && <ComplianceTab />}
        {tab === 'chemicals'     && <ChemicalsTab />}
        {tab === 'closures'      && <ClosuresTab />}
        {tab === 'risk'          && <RiskTab />}
        {tab === 'risk-register' && <RiskRegisterTab />}
        {tab === 'remote-sites'  && <RemoteSitesTab />}
        {tab === 'wqrmp'         && <WqrmpTab />}
        {tab === 'errors'        && <FeedbackTab />}
      </main>
    </div>
  )
}

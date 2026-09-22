'use client'
import { useEffect, useState } from 'react'
import { FileText, Video, Image as ImageIcon } from 'lucide-react'

// Read-only list of a site's access documents (PDF procedure, walkthrough video) for the tech app.
export default function SiteAccessDocs({ poolId, dark = true }: { poolId: string; dark?: boolean }) {
  const [docs, setDocs] = useState<any[]>([])
  useEffect(() => {
    fetch(`/api/admin/attachments?entity_type=pool_access&entity_id=${poolId}`)
      .then(r => r.json()).then(d => setDocs(d.attachments ?? [])).catch(() => setDocs([]))
  }, [poolId])
  if (docs.length === 0) return null
  const kind = (url: string) => /\.(mp4|mov|m4v|webm)$/i.test(url) ? 'video' : /\.(png|jpe?g|webp|heic)$/i.test(url) ? 'image' : 'doc'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
      {docs.map(a => {
        const k = kind(a.file_url)
        const Icon = k === 'video' ? Video : k === 'image' ? ImageIcon : FileText
        return (
          <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none',
              background: dark ? 'var(--surface-2)' : 'var(--surface)', border: '1px solid var(--border)', color: dark ? '#e2e8f0' : 'var(--text)', fontSize: '14px', fontWeight: '600' }}>
            <Icon size={18} color="#00b4d8" />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.caption || a.file_name || (k === 'video' ? 'Walkthrough video' : 'Document')}</span>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>{k === 'video' ? 'Watch' : 'Open'}</span>
          </a>
        )
      })}
    </div>
  )
}

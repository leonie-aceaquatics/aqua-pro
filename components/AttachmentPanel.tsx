'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Paperclip, Upload, Trash2, FileText } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { compressImage, prettyBytes } from '@/lib/compress-image'

interface Attachment {
  id: string
  file_url: string
  file_name: string | null
  caption: string | null
  created_at: string
}

// Reusable image/file attachment panel — pass any entityType/entityId this app cares about.
// Currently wired into Incidents and Asset Service Log (the two clearest use cases); adding it
// elsewhere needs no schema or API change, just a new <AttachmentPanel /> call.
export default function AttachmentPanel({ entityType, entityId, onChange }: { entityType: string; entityId: string; onChange?: () => void }) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    fetch(`/api/admin/attachments?entity_type=${entityType}&entity_id=${entityId}`)
      .then(r => r.json()).then(d => setAttachments(d.attachments ?? []))
  }, [entityType, entityId])
  useEffect(() => { load() }, [load])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0]
    if (!original) return
    setUploading(true); setError('')
    try {
      // Phone photos are 4-12 MB. Shrink first: faster on site, and under the bucket's limit.
      setProgress('Preparing the photo…')
      const file = await compressImage(original)

      setProgress(`Uploading ${prettyBytes(file.size)}…`)
      const signRes = await fetch('/api/admin/attachments/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, entity_type: entityType }),
      })
      const signed = await signRes.json().catch(() => ({}))
      if (!signRes.ok || signed.error) throw new Error(signed.error ?? `Could not start the upload (${signRes.status})`)
      const { path, token, bucket, publicUrl, storagePath } = signed

      const { error: upErr } = await supabaseBrowser.storage.from(bucket).uploadToSignedUrl(path, token, file)
      if (upErr) {
        // The most common one on site: the file is still bigger than the bucket allows.
        throw new Error(/exceeded|too large|payload/i.test(upErr.message)
          ? `This photo is too big for the store even after shrinking (${prettyBytes(file.size)}). Take it again at a lower resolution.`
          : `Upload failed: ${upErr.message}`)
      }

      // Record it. Without this the file sits in storage attached to nothing — which is exactly
      // how a photo used to disappear silently, because this response was never checked.
      setProgress('Saving…')
      const saveRes = await fetch('/api/admin/attachments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType, entity_id: entityId, file_name: file.name,
          file_url: publicUrl ?? storagePath,
          storage_bucket: publicUrl ? null : bucket,
        }),
      })
      if (!saveRes.ok) {
        const d = await saveRes.json().catch(() => ({}))
        throw new Error(d.error ?? `The photo uploaded but could not be attached (${saveRes.status}). Try again.`)
      }
      load(); onChange?.()
    } catch (err: any) {
      setError(err.message ?? 'Upload failed')
    }
    setUploading(false); setProgress('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id))
    await fetch(`/api/admin/attachments?id=${id}`, { method: 'DELETE' })
    onChange?.()
  }

  return (
    <div style={{ marginTop: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Paperclip size={13} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Attachments</span>
      </div>

      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          {attachments.map(a => (
            <div key={a.id} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              {/* Match on the name, not the URL — a signed link carries a ?token and never ends in .jpg */}
              {(a.file_name ?? a.file_url).match(/\.(png|jpe?g|webp|heic)(\?|$)/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.file_url} alt={a.file_name ?? 'attachment'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <a href={a.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'var(--surface-2)' }}>
                  <FileText size={20} color="var(--text-muted)" />
                </a>
              )}
              <button type="button" onClick={() => handleDelete(a.id)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '2px' }}>
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--aqua)', cursor: 'pointer' }}>
        <Upload size={12} /> {uploading ? (progress || 'Uploading…') : 'Add photo / file'}
        <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.mp4,.mov" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
      </label>
      {error && (
        <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '6px', lineHeight: 1.5 }}>
          {error}
          <button type="button" onClick={() => setError('')} style={{ marginLeft: '8px', background: 'none', border: '1px solid var(--red)', borderRadius: '5px', color: 'var(--red)', padding: '2px 7px', cursor: 'pointer', fontSize: '11px' }}>Dismiss</button>
        </div>
      )}
    </div>
  )
}

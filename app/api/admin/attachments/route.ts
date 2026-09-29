import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { SIGNED_URL_SECONDS } from '@/lib/attachment-storage'
import { canAccessEntity } from '@/lib/org-scope'

// Generic entity_type/entity_id attachment store — scope was explicitly unclear from Anthony
// ("ask him what for"), so this is wired into the two most obviously useful spots (incidents,
// asset service log) to start; adding another entity_type elsewhere needs zero schema change.

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entity_type')
  const entityId = searchParams.get('entity_id')
  if (!entityType || !entityId) return NextResponse.json({ error: 'entity_type and entity_id required' }, { status: 400 })
  if (!(await canAccessEntity(user, entityType, entityId))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('attachments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Private rows hold an object path, not a URL. Swap in a short-lived signed link so callers
  // can keep using file_url exactly as before. A failed signature drops the row rather than
  // handing back an unusable path.
  const attachments = await Promise.all((data ?? []).map(async (a: any) => {
    if (!a.storage_bucket) return a
    const { data: signed } = await supabaseAdmin.storage
      .from(a.storage_bucket).createSignedUrl(a.file_url, SIGNED_URL_SECONDS)
    return signed?.signedUrl ? { ...a, file_url: signed.signedUrl } : null
  }))
  return NextResponse.json({ attachments: attachments.filter(Boolean) })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.entity_type || !body.entity_id || !body.file_url) {
    return NextResponse.json({ error: 'entity_type, entity_id and file_url are required' }, { status: 400 })
  }
  if (!(await canAccessEntity(user, body.entity_type, body.entity_id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('attachments')
    .insert({
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      uploaded_by: user.id,
      file_url: body.file_url,            // a public URL, or the object path when private
      storage_bucket: body.storage_bucket || null,
      file_name: body.file_name || null,
      caption: body.caption || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attachment: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Take the file out of storage as well — deleting only the row leaves a public file behind,
  // which is exactly what we are trying to avoid for anything sensitive.
  const { data: row } = await supabaseAdmin.from('attachments').select('file_url, storage_bucket, entity_type, entity_id').eq('id', id).single()
  if (!row || !(await canAccessEntity(user, row.entity_type, row.entity_id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (row) {
    const bucket = row.storage_bucket ?? 'attachments'
    const path = row.storage_bucket
      ? row.file_url
      : row.file_url.split('/object/public/attachments/')[1]
    if (path) await supabaseAdmin.storage.from(bucket).remove([decodeURIComponent(path)])
  }

  const { error } = await supabaseAdmin.from('attachments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

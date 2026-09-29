import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { FEEDBACK_BUCKET } from '@/lib/attachment-storage'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename } = await req.json()
  if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 })

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `feedback/${Date.now()}_${safeName}`

  const { data, error } = await supabaseAdmin
    .storage
    .from(FEEDBACK_BUCKET)
    .createSignedUploadUrl(filePath)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // The bucket is private: store the path, and the feedback API signs it when the office reads it.
  return NextResponse.json({ path: data.path, token: data.token, storagePath: filePath })
}

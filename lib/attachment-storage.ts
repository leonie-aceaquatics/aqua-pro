import { supabaseAdmin } from '@/lib/supabase'

// Which storage bucket a file lives in.
//
// 'attachments' is PUBLIC: anything in it is readable by anyone with the link, no login. That is
// fine for job photos. Site access procedures carry door and key safe codes, and bug-report
// screenshots can show test data or a staff list, so both live in private buckets and are served
// as short-lived signed links generated only for a logged-in user.

export const PUBLIC_BUCKET = 'attachments'
export const PRIVATE_BUCKET = 'site-docs'
export const FEEDBACK_BUCKET = 'feedback-screenshots'

const PRIVATE_TYPES = new Set(['pool_access'])

export function bucketFor(entityType: string): string {
  return PRIVATE_TYPES.has(entityType) ? PRIVATE_BUCKET : PUBLIC_BUCKET
}

export const SIGNED_URL_SECONDS = 60 * 60   // an hour is plenty to open a PDF or watch a video

// Turn a stored value into a link the browser can use.
// Handles both shapes so nothing recorded before the bucket went private stops working:
//   "feedback/1727…_shot.png"                          → an object path, sign it
//   "https://…/object/public/<bucket>/feedback/1727…"  → a legacy public URL, take the path and sign that
// Returns null if it cannot be signed, so callers drop the image rather than render a broken one.
export async function signStoredFile(bucket: string, value: string | null): Promise<string | null> {
  if (!value) return null
  const marker = `/object/public/${bucket}/`
  let path = value
  if (value.startsWith('http')) {
    const i = value.indexOf(marker)
    if (i === -1) return value          // some other host — leave it alone
    path = decodeURIComponent(value.slice(i + marker.length))
  }
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS)
  return data?.signedUrl ?? null
}

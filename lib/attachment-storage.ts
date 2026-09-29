// Which storage bucket an attachment type lives in.
//
// 'attachments' is PUBLIC: anything in it is readable by anyone with the link, no login. That is
// fine for job photos. Site access procedures contain door and key safe codes, so they live in
// 'site-docs', which is private — the API signs a short-lived link for a logged-in user instead.

export const PUBLIC_BUCKET = 'attachments'
export const PRIVATE_BUCKET = 'site-docs'

const PRIVATE_TYPES = new Set(['pool_access'])

export function bucketFor(entityType: string): string {
  return PRIVATE_TYPES.has(entityType) ? PRIVATE_BUCKET : PUBLIC_BUCKET
}

export const SIGNED_URL_SECONDS = 60 * 60   // an hour is plenty to open a PDF or watch a video

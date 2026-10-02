// Shrink a photo in the browser before it is uploaded.
//
// A modern phone camera produces 4 to 12 MB per shot. On site that is a slow upload over patchy
// reception, and it can run past the storage bucket's size limit, which is how a photo silently
// fails to arrive. Nothing in a compliance record needs 12 megapixels — a gauge, a leak or a
// before-and-after reads perfectly at 1600px.
//
// Anything that is not an image, or that the browser cannot decode (an iPhone HEIC in a browser
// without support), is passed through untouched rather than lost.

const MAX_EDGE = 1600
const QUALITY = 0.82
/** Below this, resizing costs more than it saves. */
const SKIP_UNDER_BYTES = 400 * 1024

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size <= SKIP_UNDER_BYTES) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', QUALITY))
    if (!blob || blob.size >= file.size) return file   // no gain, keep the original

    const name = file.name.replace(/\.(heic|heif|png|webp|jpe?g)$/i, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file   // could not decode it — send the original rather than nothing
  }
}

export const prettyBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`

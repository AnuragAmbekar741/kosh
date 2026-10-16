const MAX_EDGE = 2000
const QUALITY = 0.85

/**
 * Phone photos are 4–12 MB; a receipt reads fine at 2000px. Re-encodes an
 * image as JPEG with its long edge at most 2000px. PDFs, small images, and
 * anything the browser can't decode (HEIC outside Safari) go up untouched;
 * the worker handles those.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    return file
  }
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 1_500_000) return file
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    )
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, "") || "photo"
    return new File([blob], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    })
  } finally {
    bitmap.close()
  }
}

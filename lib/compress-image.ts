/**
 * Compress an image File using the browser Canvas API before upload.
 * - Skips non-image files (e.g. PDFs) unchanged.
 * - Skips files already under the size threshold.
 * - Outputs JPEG for photos, preserves PNG only when the original is PNG and small.
 */
export interface CompressOptions {
  maxWidth?: number   // default 1200
  maxHeight?: number  // default 1200
  quality?: number    // 0–1, default 0.85
  /** Skip compression when original is smaller than this (bytes). Default 100KB */
  skipBelowBytes?: number
}

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    skipBelowBytes = 100 * 1024,
  } = opts

  if (!file.type.startsWith("image/") || file.type === "image/gif") return file
  if (file.size < skipBelowBytes) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) return resolve(file)
      ctx.drawImage(img, 0, 0, width, height)

      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg"
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file)
          // Keep original filename but update extension if type changed
          const ext = outputType === "image/jpeg" ? "jpg" : "png"
          const baseName = file.name.replace(/\.[^.]+$/, "")
          const compressed = new File([blob], `${baseName}.${ext}`, { type: outputType })
          // Only use compressed version if it's actually smaller
          resolve(compressed.size < file.size ? compressed : file)
        },
        outputType,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file) // fall back to original on error
    }

    img.src = url
  })
}

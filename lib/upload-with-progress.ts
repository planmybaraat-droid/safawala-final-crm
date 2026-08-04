// Reusable XHR upload utility with progress callback
// Usage: uploadWithProgress(file, { folder: 'avatars' }, (loaded,total)=>{})
export interface UploadResult {
  url: string
  filePath: string
  filename: string
  size: number
  type: string
}

export async function uploadWithProgress(
  file: File,
  options: { folder?: string; endpoint?: string } = {},
  onProgress?: (loaded: number, total: number) => void
): Promise<UploadResult> {
  const { folder, endpoint = '/api/upload' } = options
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    if (folder) formData.append('folder', folder)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint, true)
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText)
            if (!json || json.error) return reject(new Error(json?.error || 'Upload failed'))
            resolve(json as UploadResult)
          } catch (e) {
            reject(e)
          }
        } else {
          reject(new Error('Upload failed'))
        }
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) onProgress(evt.loaded, evt.total)
    }
    xhr.send(formData)
  })
}

// Helper to upload multiple files sequentially and aggregate progress (0-100)
export async function uploadMultiple(
  files: File[],
  opts: { folder?: string; endpoint?: string } = {},
  onOverallProgress?: (percent: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  let accumulated = 0
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    await uploadWithProgress(file, opts, (loaded, total) => {
      const fileProgress = loaded / total
      const overall = ((accumulated + fileProgress) / files.length) * 100
      onOverallProgress?.(overall)
    })
      .then(r => results.push(r))
    accumulated += 1 // mark file fully done before next iteration
  }
  onOverallProgress?.(100)
  return results
}

"use client"

export interface WikiUploadResult {
  url: string
  filename: string
  size: number
  mimeType: string
  attachmentId: string
}

export async function uploadWikiFile(
  file: File,
  pageId?: string
): Promise<WikiUploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  if (pageId) {
    formData.append('pageId', pageId)
  }

  const response = await fetch('/api/wiki/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? `Upload failed: ${response.status}`)
  }

  return response.json() as Promise<WikiUploadResult>
}

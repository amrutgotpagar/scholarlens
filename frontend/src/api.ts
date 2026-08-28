import type { Citation, DocumentOut, FeedbackRating } from './types'

const API_BASE = '/api'

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body.detail || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

export async function listDocuments(): Promise<DocumentOut[]> {
  const res = await fetch(`${API_BASE}/documents`)
  if (!res.ok) throw new Error(await parseErrorDetail(res))
  return res.json()
}

interface PresignResponse {
  document_id: string
  upload_url: string
  upload_fields: Record<string, string>
}

/** Three steps, none of which route the raw file through our backend:
 * 1. ask the backend for a presigned S3 POST (scoped to this exact filename/content-type,
 *    with size limits enforced by S3 itself, not just trusted from the client)
 * 2. upload the file directly to S3 with that presigned POST
 * 3. tell the backend the upload landed, so it can fetch the object from S3 once and
 *    run extraction/chunking/embedding */
export async function uploadDocument(file: File): Promise<DocumentOut> {
  const presignRes = await fetch(`${API_BASE}/documents/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, content_type: file.type }),
  })
  if (!presignRes.ok) throw new Error(await parseErrorDetail(presignRes))
  const presign: PresignResponse = await presignRes.json()

  const formData = new FormData()
  for (const [key, value] of Object.entries(presign.upload_fields)) {
    formData.append(key, value)
  }
  formData.append('file', file) // must be appended last per S3's presigned POST requirements

  const uploadRes = await fetch(presign.upload_url, { method: 'POST', body: formData })
  if (!uploadRes.ok) {
    throw new Error(`Upload to storage failed (${uploadRes.status})`)
  }

  const finalizeRes = await fetch(`${API_BASE}/documents/${presign.document_id}/finalize`, {
    method: 'POST',
  })
  if (!finalizeRes.ok) throw new Error(await parseErrorDetail(finalizeRes))
  return finalizeRes.json()
}

export async function submitFeedback(
  question: string,
  answer: string,
  rating: FeedbackRating,
  documentId: string | null,
): Promise<void> {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer, rating, document_id: documentId }),
  })
  if (!res.ok) throw new Error(await parseErrorDetail(res))
}

export type QueryStreamEvent =
  | { event: 'citations'; data: { citations: Citation[] } }
  | { event: 'token'; data: { text: string } }
  | { event: 'done'; data: Record<string, never> }
  | { event: 'error'; data: { detail: string } }

export async function* streamQuery(
  question: string,
  documentId: string | null,
): AsyncGenerator<QueryStreamEvent> {
  const res = await fetch(`${API_BASE}/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, document_id: documentId }),
  })
  if (!res.ok || !res.body) {
    throw new Error(await parseErrorDetail(res))
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let separatorIndex: number
    while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex)
      buffer = buffer.slice(separatorIndex + 2)

      const eventMatch = rawEvent.match(/^event: (.+)$/m)
      const dataMatch = rawEvent.match(/^data: (.+)$/m)
      if (!dataMatch) continue

      yield {
        event: (eventMatch?.[1] ?? 'message') as QueryStreamEvent['event'],
        data: JSON.parse(dataMatch[1]),
      } as QueryStreamEvent
    }
  }
}

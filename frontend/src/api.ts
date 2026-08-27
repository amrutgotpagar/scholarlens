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

export async function uploadDocument(file: File): Promise<DocumentOut> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/documents`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(await parseErrorDetail(res))
  return res.json()
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

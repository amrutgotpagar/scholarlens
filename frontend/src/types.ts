export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed'

export interface DocumentOut {
  id: string
  filename: string
  title: string | null
  status: DocumentStatus
  page_count: number | null
  error_message: string | null
  created_at: string
}

export interface Citation {
  ref_id: number
  document_id: string
  document_title: string
  page_number: number | null
  text: string
}

export type FeedbackRating = 'up' | 'down'

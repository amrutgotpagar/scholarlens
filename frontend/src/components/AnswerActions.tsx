import { Check, Copy, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { submitFeedback } from '../api'
import type { FeedbackRating } from '../types'

interface Props {
  question: string
  answer: string
  documentId: string | null
}

export function AnswerActions({ question, answer, documentId }: Props) {
  const [copied, setCopied] = useState(false)
  const [rating, setRating] = useState<FeedbackRating | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(answer)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied by the browser; there's nothing actionable to
      // show the user beyond the button simply not flipping to the "copied" state.
    }
  }

  const handleRate = async (value: FeedbackRating) => {
    if (rating || submitting) return // one rating per answer — feedback rows aren't editable
    setSubmitting(true)
    setRating(value) // optimistic; a failed submit still leaves the user's choice visible
    try {
      await submitFeedback(question, answer, value, documentId)
    } catch {
      // Feedback is a nice-to-have signal, not core functionality — a failed submit
      // isn't worth interrupting the user with an error for.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-2 flex items-center gap-1 text-slate-400 dark:text-slate-500">
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label="Copy answer"
        className="rounded-md p-1.5 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </button>
      <button
        type="button"
        onClick={() => void handleRate('up')}
        disabled={rating !== null}
        aria-label="Good answer"
        className={`rounded-md p-1.5 transition-colors disabled:cursor-default ${
          rating === 'up'
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300'
        }`}
      >
        <ThumbsUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => void handleRate('down')}
        disabled={rating !== null}
        aria-label="Bad answer"
        className={`rounded-md p-1.5 transition-colors disabled:cursor-default ${
          rating === 'down'
            ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
            : 'hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300'
        }`}
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  )
}

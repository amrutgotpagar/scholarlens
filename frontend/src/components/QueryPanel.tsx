import { useState } from 'react'
import { streamQuery } from '../api'
import type { Citation } from '../types'
import { AnswerText } from './AnswerText'
import { SourcesPanel } from './SourcesPanel'

interface Props {
  selectedDocumentId: string | null
  selectedDocumentLabel: string
}

type Status = 'idle' | 'streaming' | 'done' | 'error'

export function QueryPanel({ selectedDocumentId, selectedDocumentLabel }: Props) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [highlightedRefId, setHighlightedRefId] = useState<number | null>(null)

  const validRefIds = new Set(citations.map((c) => c.ref_id))

  const handleAsk = async () => {
    const trimmed = question.trim()
    if (!trimmed || status === 'streaming') return

    setAnswer('')
    setCitations([])
    setErrorMessage(null)
    setStatus('streaming')

    try {
      for await (const evt of streamQuery(trimmed, selectedDocumentId)) {
        if (evt.event === 'citations') {
          setCitations(evt.data.citations)
        } else if (evt.event === 'token') {
          setAnswer((prev) => prev + evt.data.text)
        } else if (evt.event === 'error') {
          setErrorMessage(evt.data.detail)
          setStatus('error')
          return
        } else if (evt.event === 'done') {
          setStatus('done')
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  const handleCitationClick = (refId: number) => {
    setHighlightedRefId(refId)
    // 'smooth' is skipped rather than a fallback: some browser/automation contexts never
    // run the smooth-scroll animation frames at all, silently leaving scrollTop unchanged.
    // 'instant' guarantees the scroll actually happens everywhere; the highlight pulse
    // still gives a clear visual cue of what changed.
    document.getElementById(`source-${refId}`)?.scrollIntoView({ behavior: 'instant', block: 'center' })
    window.setTimeout(() => setHighlightedRefId((current) => (current === refId ? null : current)), 2000)
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
      <div className="mb-2 text-xs font-medium text-slate-400">
        Asking across: <span className="text-slate-600">{selectedDocumentLabel}</span>
      </div>

      <div className="flex gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleAsk()
            }
          }}
          placeholder="Ask a question about the paper(s)…"
          rows={3}
          className="flex-1 resize-none rounded-lg border border-slate-300 p-3 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handleAsk()}
          disabled={status === 'streaming' || !question.trim()}
          className="h-fit self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'streaming' ? 'Asking…' : 'Ask'}
        </button>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!errorMessage && (answer || status === 'streaming') && (
          <AnswerText text={answer} validRefIds={validRefIds} onCitationClick={handleCitationClick} />
        )}

        {!errorMessage && status === 'idle' && !answer && (
          <p className="text-sm text-slate-400">Answers stream in below as they're generated, with citations.</p>
        )}

        <SourcesPanel citations={citations} highlightedRefId={highlightedRefId} />
      </div>
    </div>
  )
}

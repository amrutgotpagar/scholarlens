import { AlertCircle, ArrowUp, MessageCircleQuestion } from 'lucide-react'
import { useState } from 'react'
import { streamQuery } from '../api'
import type { Citation } from '../types'
import { AnswerText } from './AnswerText'
import { SourcesPanel } from './SourcesPanel'

const EXAMPLE_PROMPTS = [
  'Summarize the key contribution of this paper in two sentences.',
  'What method or architecture does it propose?',
  'What datasets or benchmarks were used to evaluate it?',
]

interface Props {
  selectedDocumentId: string | null
  selectedDocumentLabel: string
  hasDocuments: boolean
}

type Status = 'idle' | 'streaming' | 'done' | 'error'

export function QueryPanel({ selectedDocumentId, selectedDocumentLabel, hasDocuments }: Props) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState<Citation[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [highlightedRefId, setHighlightedRefId] = useState<number | null>(null)

  const validRefIds = new Set(citations.map((c) => c.ref_id))

  const runQuery = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim()
    if (!trimmed || status === 'streaming') return

    setQuestion(trimmed)
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

  const isEmpty = status === 'idle' && !answer && !errorMessage

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
        <span>Asking across</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {selectedDocumentLabel}
        </span>
      </div>

      <div className="flex gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void runQuery(question)
            }
          }}
          placeholder="Ask a question about the paper(s)…"
          rows={3}
          className="flex-1 resize-none rounded-xl border border-slate-200 bg-white p-3.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/10"
        />
        <button
          type="button"
          onClick={() => void runQuery(question)}
          disabled={status === 'streaming' || !question.trim()}
          className="flex h-fit shrink-0 items-center gap-1.5 self-end rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-600"
        >
          {status === 'streaming' ? 'Asking' : 'Ask'}
          <ArrowUp size={15} />
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-600">
        Enter to ask · Shift+Enter for a new line
      </p>

      <div className="mt-4 flex-1 overflow-y-auto">
        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
              <MessageCircleQuestion size={22} />
            </div>
            <p className="max-w-xs text-sm text-slate-400 dark:text-slate-500">
              Answers stream in below as they're generated, with citations back to the exact page.
            </p>
            {hasDocuments && (
              <div className="flex flex-col gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void runQuery(prompt)}
                    className="rounded-full border border-slate-200 px-3.5 py-1.5 text-[13px] text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {errorMessage}
          </div>
        )}

        {!errorMessage && status === 'streaming' && !answer && (
          <div className="flex items-center gap-1.5 py-1 text-slate-400 dark:text-slate-500">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current [animation-delay:300ms]" />
          </div>
        )}

        {!errorMessage && answer && (
          <div className="animate-fade-in">
            <AnswerText text={answer} validRefIds={validRefIds} onCitationClick={handleCitationClick} />
          </div>
        )}

        <SourcesPanel citations={citations} highlightedRefId={highlightedRefId} />
      </div>
    </div>
  )
}

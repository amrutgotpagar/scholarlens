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
  const canSend = status !== 'streaming' && !!question.trim()

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="flex items-center gap-1.5 px-6 pt-6 text-xs font-medium text-slate-400 dark:text-slate-500">
        <span>Asking across</span>
        <span className="rounded-full bg-slate-100/80 px-2 py-0.5 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
          {selectedDocumentLabel}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-500 ring-1 ring-indigo-100 dark:from-indigo-500/10 dark:to-violet-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
              <MessageCircleQuestion size={24} />
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
                    className="rounded-full border border-slate-200 bg-white/60 px-3.5 py-1.5 text-[13px] text-slate-600 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
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

      <div className="border-t border-slate-200/70 bg-white/70 px-6 py-4 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/70">
        <div className="relative">
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
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-3.5 pr-14 text-[15px] text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/10"
          />
          <button
            type="button"
            onClick={() => void runQuery(question)}
            disabled={!canSend}
            aria-label={status === 'streaming' ? 'Asking' : 'Ask'}
            className="absolute right-2.5 bottom-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 transition-all duration-150 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
          >
            <ArrowUp size={17} />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-600">
          Enter to ask · Shift+Enter for a new line
        </p>
      </div>
    </div>
  )
}

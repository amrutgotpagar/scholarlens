import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ArrowUp, MessageCircleQuestion } from 'lucide-react'
import { useState } from 'react'
import { streamQuery } from '../api'
import type { Citation } from '../types'
import { AnswerActions } from './AnswerActions'
import { AnswerText } from './AnswerText'
import { FollowUps } from './FollowUps'
import { SourcesPanel } from './SourcesPanel'

const EXAMPLE_PROMPTS = [
  'Summarize the key contribution of this paper in two sentences.',
  'What method or architecture does it propose?',
  'What datasets or benchmarks were used to evaluate it?',
]

const promptListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const promptItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

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
  const [isFocused, setIsFocused] = useState(false)

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
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-500 ring-1 ring-indigo-100 dark:from-indigo-500/10 dark:to-violet-500/10 dark:text-indigo-400 dark:ring-indigo-500/20"
            >
              <MessageCircleQuestion size={24} />
            </motion.div>
            <p className="max-w-xs text-sm text-slate-400 dark:text-slate-500">
              Answers stream in below as they're generated, with citations back to the exact page.
            </p>
            {hasDocuments && (
              <motion.div
                variants={promptListVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-2"
              >
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <motion.button
                    key={prompt}
                    variants={promptItemVariants}
                    type="button"
                    onClick={() => void runQuery(prompt)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-full border border-slate-200 bg-white/60 px-3.5 py-1.5 text-[13px] text-slate-600 shadow-sm transition-colors duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  >
                    {prompt}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {errorMessage}
          </motion.div>
        )}

        <AnimatePresence>
          {!errorMessage && status === 'streaming' && !answer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 py-1 text-slate-400 dark:text-slate-500"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-current"
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!errorMessage && answer && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <AnswerText
              text={answer}
              citations={citations}
              onCitationClick={handleCitationClick}
              isStreaming={status === 'streaming'}
            />
            {status === 'done' && (
              <>
                <AnswerActions question={question} answer={answer} documentId={selectedDocumentId} />
                <FollowUps onSelect={(prompt) => void runQuery(prompt)} />
              </>
            )}
          </motion.div>
        )}

        <SourcesPanel citations={citations} highlightedRefId={highlightedRefId} />
      </div>

      <div className="border-t border-slate-200/70 bg-white/70 px-6 py-4 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/70">
        <motion.div
          className="relative rounded-2xl"
          animate={{
            boxShadow: isFocused
              ? '0 0 0 4px rgba(99,102,241,0.14), 0 4px 20px rgba(99,102,241,0.12)'
              : '0 0 0 0px rgba(99,102,241,0)',
          }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void runQuery(question)
              }
            }}
            placeholder="Ask a question about the paper(s)…"
            rows={3}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-3.5 pr-14 text-[15px] text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500"
          />
          <motion.button
            type="button"
            onClick={() => void runQuery(question)}
            disabled={!canSend}
            aria-label={status === 'streaming' ? 'Asking' : 'Ask'}
            whileHover={canSend ? { scale: 1.08 } : undefined}
            whileTap={canSend ? { scale: 0.92 } : undefined}
            animate={status === 'streaming' ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
            transition={status === 'streaming' ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.15 }}
            className="absolute right-2.5 bottom-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
          >
            <ArrowUp size={17} />
          </motion.button>
        </motion.div>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-600">
          Enter to ask · Shift+Enter for a new line
        </p>
      </div>
    </div>
  )
}

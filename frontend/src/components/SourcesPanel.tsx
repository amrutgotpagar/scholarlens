import { FileText } from 'lucide-react'
import type { Citation } from '../types'

interface Props {
  citations: Citation[]
  highlightedRefId: number | null
}

export function SourcesPanel({ citations, highlightedRefId }: Props) {
  if (citations.length === 0) return null

  return (
    <div className="mt-8 border-t border-slate-200 pt-5 dark:border-slate-800">
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
        Sources
      </h3>
      <div className="space-y-2.5">
        {citations.map((citation) => {
          const isHighlighted = highlightedRefId === citation.ref_id
          return (
            <div
              key={citation.ref_id}
              id={`source-${citation.ref_id}`}
              className={`scroll-mt-4 rounded-xl border p-3.5 text-sm transition-all duration-300 ${
                isHighlighted
                  ? 'border-indigo-300 bg-indigo-50/80 ring-2 ring-indigo-200 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
              }`}
            >
              <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {citation.ref_id}
                </span>
                <FileText size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="truncate">{citation.document_title}</span>
                {citation.page_number !== null && (
                  <span className="shrink-0 text-slate-400 dark:text-slate-500">
                    · p. {citation.page_number}
                  </span>
                )}
              </div>
              <p className="leading-relaxed text-slate-600 dark:text-slate-300">{citation.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

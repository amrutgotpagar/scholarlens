import { Sparkles } from 'lucide-react'
import type { DocumentOut } from '../types'

interface Props {
  documents: DocumentOut[]
}

export function TopBar({ documents }: Props) {
  const readyCount = documents.filter((d) => d.status === 'ready').length
  const totalPages = documents.reduce((sum, d) => sum + (d.page_count ?? 0), 0)

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200/70 px-5 py-3 dark:border-slate-800/70">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30">
          <Sparkles size={16} />
        </div>
        <div>
          <h1 className="text-[15px] leading-tight font-semibold tracking-tight text-slate-900 dark:text-white">
            arXiv RAG Q&amp;A
          </h1>
          <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
            Grounded answers, cited to the page
          </p>
        </div>
      </div>

      {readyCount > 0 && (
        <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[12px] text-slate-500 shadow-sm sm:flex dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
          <span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{readyCount}</span>{' '}
            {readyCount === 1 ? 'paper' : 'papers'}
          </span>
          <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{totalPages}</span> pages indexed
          </span>
        </div>
      )}
    </header>
  )
}

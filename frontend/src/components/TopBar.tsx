import { LogOut } from 'lucide-react'
import { Logomark } from './Logomark'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import type { DocumentOut } from '../types'

interface Props {
  documents: DocumentOut[]
}

export function TopBar({ documents }: Props) {
  const readyCount = documents.filter((d) => d.status === 'ready').length
  const totalPages = documents.reduce((sum, d) => sum + (d.page_count ?? 0), 0)
  const { user } = useAuth()

  return (
    <header className="relative z-10 flex shrink-0 items-center justify-between px-5 py-3 shadow-[0_1px_0_rgba(15,23,42,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-2.5">
        <Logomark size={32} className="shadow-md shadow-indigo-500/30" />
        <div>
          <h1 className="text-[15px] leading-tight font-semibold tracking-tight text-slate-900 dark:text-white">
            arXiv RAG Q&amp;A
          </h1>
          <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
            Grounded answers, cited to the page
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {readyCount > 0 && (
          <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[12px] text-slate-500 shadow-sm sm:flex dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
            <span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{readyCount}</span>{' '}
              {readyCount === 1 ? 'paper' : 'papers'}
            </span>
            <span className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
            <span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{totalPages}</span> pages indexed
            </span>
          </div>
        )}
        {user && (
          <div className="flex items-center gap-2">
            <span className="hidden text-[12px] text-slate-400 sm:inline dark:text-slate-600">{user.email}</span>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

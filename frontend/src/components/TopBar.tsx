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
    <header className="relative z-10 flex shrink-0 items-center justify-between overflow-hidden px-5 py-3">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 420px 120px at 12% 0%, rgba(99,102,241,0.07), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent dark:via-indigo-500/20"
      />
      <div className="relative flex items-center gap-2.5">
        <Logomark size={32} className="shadow-md shadow-indigo-500/30" />
        <div>
          <h1 className="font-serif text-[16px] leading-tight font-semibold tracking-tight text-slate-900 dark:text-white">
            ScholarLens
          </h1>
          <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
            Grounded answers, cited to the page
          </p>
        </div>
      </div>

      <div className="relative flex items-center gap-3">
        {readyCount > 0 && (
          <div className="hidden items-center gap-3 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-[12px] text-slate-500 shadow-sm backdrop-blur-sm sm:flex dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
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

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'

function initialFrom(text: string): string {
  return text.trim().charAt(0).toUpperCase() || '?'
}

export function AccountMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!user) return null

  const avatarUrl = (user.user_metadata?.avatar_url ?? user.user_metadata?.picture) as string | undefined
  const displayName = (user.user_metadata?.full_name ?? user.user_metadata?.name) as string | undefined
  const email = user.email ?? ''

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-1.5 transition-colors ${
          open
            ? 'border-indigo-200 bg-indigo-50/80 dark:border-indigo-500/30 dark:bg-indigo-500/10'
            : 'border-slate-200/70 bg-white/60 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800'
        }`}
      >
        {displayName && (
          <span className="hidden pl-1 text-[13px] font-medium text-slate-600 sm:inline dark:text-slate-300">
            {displayName}
          </span>
        )}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 shrink-0 rounded-full ring-2 ring-white shadow-sm dark:ring-slate-900"
          />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[12px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
            {initialFrom(displayName ?? email)}
          </span>
        )}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 380 }}
            role="menu"
            className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-900/15 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/50"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 shrink-0 rounded-full ring-2 ring-white shadow-sm dark:ring-slate-900"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[13px] font-semibold text-white shadow-sm">
                  {initialFrom(displayName ?? email)}
                </span>
              )}
              <div className="min-w-0">
                {displayName && (
                  <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {displayName}
                  </p>
                )}
                <p className="truncate text-[12px] text-slate-400 dark:text-slate-500">{email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void supabase.auth.signOut()
              }}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

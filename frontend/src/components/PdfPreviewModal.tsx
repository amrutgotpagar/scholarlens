import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, FileText, X } from 'lucide-react'
import { useEffect } from 'react'
import type { DocumentOut } from '../types'

interface Props {
  document: DocumentOut | null
  onClose: () => void
}

export function PdfPreviewModal({ document, onClose }: Props) {
  useEffect(() => {
    if (!document) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [document, onClose])

  if (!document) return null
  const fileUrl = `/api/documents/${document.id}/file`

  return (
    <AnimatePresence>
      {document && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800/80 dark:bg-slate-900"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={16} className="shrink-0 text-indigo-500" />
                <span className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">
                  {document.title ?? document.filename}
                </span>
                {document.page_count !== null && (
                  <span className="shrink-0 text-[12px] text-slate-400 dark:text-slate-500">
                    · {document.page_count} pages
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in new tab"
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close preview"
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-950">
              <iframe src={fileUrl} title={document.filename} className="h-full w-full border-0" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

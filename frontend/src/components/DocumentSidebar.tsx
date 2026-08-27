import { AlertCircle, CheckCircle2, Clock, FileText, Loader2, Sparkles, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import type { DocumentOut } from '../types'

const STATUS_CONFIG: Record<DocumentOut['status'], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  ready: {
    label: 'Ready',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  processing: {
    label: 'Processing',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    icon: Loader2,
  },
  pending: {
    label: 'Pending',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    icon: Clock,
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    icon: AlertCircle,
  },
}

interface Props {
  documents: DocumentOut[]
  selectedDocumentId: string | null
  onSelectDocument: (id: string | null) => void
  onUpload: (file: File) => Promise<void>
  uploading: boolean
  uploadError: string | null
}

export function DocumentSidebar({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onUpload,
  uploading,
  uploadError,
}: Props) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (file) void onUpload(file)
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Sparkles size={15} />
          </div>
          <h1 className="text-[15px] font-semibold text-slate-900 dark:text-white">arXiv RAG Q&A</h1>
        </div>
        <p className="mt-2 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
          Upload papers, then ask grounded questions with citations back to the source.
        </p>
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFile(e.dataTransfer.files[0])
          }}
          disabled={uploading}
          className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/10'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-900'
          } ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-indigo-500" />
          ) : (
            <UploadCloud size={20} className="text-slate-400 dark:text-slate-500" />
          )}
          <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
            {uploading ? 'Uploading…' : 'Drop a PDF or click to upload'}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {uploadError && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {uploadError}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <button
          type="button"
          onClick={() => onSelectDocument(null)}
          className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
            selectedDocumentId === null
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'
          }`}
        >
          All documents
        </button>

        {documents.map((doc) => {
          const status = STATUS_CONFIG[doc.status]
          const StatusIcon = status.icon
          const isSelected = selectedDocumentId === doc.id
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelectDocument(doc.id)}
              className={`group mb-1 w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                isSelected ? 'bg-indigo-50 dark:bg-indigo-500/15' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-2">
                <FileText
                  size={15}
                  className={`mt-0.5 shrink-0 ${isSelected ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">
                    {doc.title ?? doc.filename}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${status.className}`}
                    >
                      <StatusIcon size={10} className={doc.status === 'processing' ? 'animate-spin' : ''} />
                      {status.label}
                    </span>
                    {doc.page_count !== null && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                      </span>
                    )}
                  </div>
                  {doc.status === 'failed' && doc.error_message && (
                    <div className="mt-1 text-[11px] text-red-600 dark:text-red-400">{doc.error_message}</div>
                  )}
                </div>
              </div>
            </button>
          )
        })}

        {documents.length === 0 && (
          <p className="px-3 py-2 text-[13px] text-slate-400 dark:text-slate-500">No documents yet.</p>
        )}
      </div>
    </aside>
  )
}

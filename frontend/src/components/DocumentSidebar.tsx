import { useRef, useState } from 'react'
import type { DocumentOut } from '../types'

const STATUS_STYLES: Record<DocumentOut['status'], string> = {
  ready: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-amber-100 text-amber-700',
  pending: 'bg-slate-100 text-slate-600',
  failed: 'bg-red-100 text-red-700',
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
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <h1 className="text-lg font-semibold text-slate-900">arXiv RAG Q&A</h1>
        <p className="mt-1 text-sm text-slate-500">Upload papers, then ask grounded questions.</p>
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
          className={`w-full rounded-lg border-2 border-dashed p-4 text-sm transition-colors ${
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
          } ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          {uploading ? 'Uploading…' : 'Click or drop a PDF to upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <button
          type="button"
          onClick={() => onSelectDocument(null)}
          className={`mb-1 w-full rounded-md px-3 py-2 text-left text-sm ${
            selectedDocumentId === null ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
          }`}
        >
          All documents
        </button>
        {documents.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => onSelectDocument(doc.id)}
            className={`mb-1 w-full rounded-md px-3 py-2 text-left ${
              selectedDocumentId === doc.id ? 'bg-indigo-50' : 'hover:bg-slate-50'
            }`}
          >
            <div className="truncate text-sm font-medium text-slate-800">
              {doc.title ?? doc.filename}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[doc.status]}`}>
                {doc.status}
              </span>
              {doc.page_count !== null && (
                <span className="text-xs text-slate-400">{doc.page_count} pages</span>
              )}
            </div>
            {doc.status === 'failed' && doc.error_message && (
              <div className="mt-1 text-xs text-red-600">{doc.error_message}</div>
            )}
          </button>
        ))}
        {documents.length === 0 && (
          <p className="px-3 py-2 text-sm text-slate-400">No documents yet.</p>
        )}
      </div>
    </aside>
  )
}

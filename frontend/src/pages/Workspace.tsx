import { useEffect, useState } from 'react'
import { deleteDocument, listDocuments, uploadDocument } from '../api'
import { DocumentSidebar } from '../components/DocumentSidebar'
import { PdfPreviewModal } from '../components/PdfPreviewModal'
import { QueryPanel } from '../components/QueryPanel'
import { TopBar } from '../components/TopBar'
import type { DocumentOut } from '../types'

export function Workspace() {
  const [documents, setDocuments] = useState<DocumentOut[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewDocument, setPreviewDocument] = useState<DocumentOut | null>(null)

  const refreshDocuments = async () => {
    try {
      setDocuments(await listDocuments())
    } catch {
      // Listing failure isn't actionable from here; the sidebar just stays empty/stale.
    }
  }

  useEffect(() => {
    void refreshDocuments()
  }, [])

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      await uploadDocument(file)
      await refreshDocuments()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (document: DocumentOut) => {
    if (selectedDocumentId === document.id) setSelectedDocumentId(null)
    setDocuments((prev) => prev.filter((d) => d.id !== document.id)) // optimistic — a stuck row should disappear immediately
    try {
      await deleteDocument(document.id)
    } catch {
      await refreshDocuments() // restore the real state if the delete didn't actually go through
    }
  }

  const selectedDocument = documents.find((d) => d.id === selectedDocumentId)
  const selectedDocumentLabel = selectedDocument ? selectedDocument.title ?? selectedDocument.filename : 'All documents'

  return (
    <div className="premium-bg flex h-screen w-screen flex-col overflow-hidden bg-slate-100 dark:bg-black">
      <TopBar documents={documents} />
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <DocumentSidebar
          documents={documents}
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={setSelectedDocumentId}
          onUpload={handleUpload}
          uploading={uploading}
          uploadError={uploadError}
          onPreview={setPreviewDocument}
          onDelete={handleDelete}
        />
        <div className="flex-1 overflow-hidden rounded-[17px] bg-gradient-to-br from-indigo-200/60 via-white/40 to-violet-200/60 p-px shadow-xl shadow-slate-900/5 dark:from-indigo-500/20 dark:via-white/5 dark:to-violet-500/15 dark:shadow-black/30">
          <main className="premium-bg h-full overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
            <QueryPanel
              selectedDocumentId={selectedDocumentId}
              selectedDocumentLabel={selectedDocumentLabel}
              hasDocuments={documents.some((d) => d.status === 'ready')}
            />
          </main>
        </div>
      </div>
      <PdfPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
    </div>
  )
}

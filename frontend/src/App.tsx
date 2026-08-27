import { useEffect, useState } from 'react'
import { listDocuments, uploadDocument } from './api'
import { DocumentSidebar } from './components/DocumentSidebar'
import { PdfPreviewModal } from './components/PdfPreviewModal'
import { QueryPanel } from './components/QueryPanel'
import { TopBar } from './components/TopBar'
import type { DocumentOut } from './types'

function App() {
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

  const selectedDocument = documents.find((d) => d.id === selectedDocumentId)
  const selectedDocumentLabel = selectedDocument ? selectedDocument.title ?? selectedDocument.filename : 'All documents'

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 dark:bg-black">
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
        />
        <main className="premium-bg flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-black/30">
          <QueryPanel
            selectedDocumentId={selectedDocumentId}
            selectedDocumentLabel={selectedDocumentLabel}
            hasDocuments={documents.some((d) => d.status === 'ready')}
          />
        </main>
      </div>
      <PdfPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
    </div>
  )
}

export default App
